import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path, { dirname } from 'path';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import os from 'os';
import net from 'net';
import { fileURLToPath } from 'url';

// Services
import { AdbService } from './services/AdbService.js';
import { GameListener } from './services/GameListener.js';
import { Database } from './services/Database.js'; // Assuming this exists or we can just use JSON for now as per "Hybrid" plan

// Types & Constants
import { INITIAL_STATE, DEFAULT_GAME_DATA } from './types.js';
import type { AppState, TeamLibraryEntry, GameData, TeamData, SyncControl } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// --- CONFIGURATION ---
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'upload');
const CONFIG_DIR = path.join(__dirname, '..', 'config');

// Ensure directories exist
fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(CONFIG_DIR);
fs.ensureDirSync(path.join(PUBLIC_DIR, 'assets', 'teams'));

// Files
const METADATA_FILE = path.join(CONFIG_DIR, 'metadata.json');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');
const VISIBILITY_FILE = path.join(CONFIG_DIR, 'visibility.json');
const GAME_CONFIG_FILE = path.join(CONFIG_DIR, 'game_config.json');

// --- APP STATE MANAGEMENT ---
let appState: AppState = { ...INITIAL_STATE };
let persistentVisibility = INITIAL_STATE.game.visibility;

// Load Persisted Data
try {
    if (fs.existsSync(VISIBILITY_FILE)) {
        const loadedVis = fs.readJsonSync(VISIBILITY_FILE);
        // Merge loaded visibility with defaults to ensure new keys (like isAutoSync) exist
        persistentVisibility = { ...INITIAL_STATE.game.visibility, ...loadedVis };
        appState.game.visibility = persistentVisibility;
    }
    
    if (fs.existsSync(METADATA_FILE)) {
        const savedState = fs.readJsonSync(METADATA_FILE);
        // Deep merge logic simplified
        appState = { ...appState, ...savedState, game: { ...appState.game, ...savedState.game } };
        // Restore visibility priority
        appState.game.visibility = persistentVisibility;
    }

    if (fs.existsSync(HISTORY_FILE)) {
        appState.history = fs.readJsonSync(HISTORY_FILE);
    }
} catch (e) {
    console.error('Error loading config files:', e);
}

const saveState = () => {
    try {
        fs.writeJsonSync(METADATA_FILE, appState, { spaces: 2 });
        if (JSON.stringify(appState.game.visibility) !== JSON.stringify(persistentVisibility)) {
            persistentVisibility = appState.game.visibility;
            fs.writeJsonSync(VISIBILITY_FILE, persistentVisibility, { spaces: 2 });
        }
    } catch (e) {
        console.error('Error saving state:', e);
    }
};

// --- EXPRESS SETUP ---
const app = express();
app.use(cors());
app.use(express.json());

// Serve Static Files
app.use(express.static(PUBLIC_DIR));
app.use('/upload', express.static(UPLOAD_DIR));

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/api/import-ads', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
        console.log('Received ads zip:', req.file.originalname);
        const zip = new AdmZip(req.file.path);
        const zipEntries = zip.getEntries();
        const adAssetsDir = path.join(UPLOAD_DIR, 'ads');
        fs.ensureDirSync(adAssetsDir);

        let imageEntries = zipEntries.filter(entry =>
            !entry.isDirectory &&
            entry.entryName.toLowerCase().startsWith('images/') &&
            /\.(png|jpg|jpeg|gif|webp)$/i.test(entry.entryName)
        );

        // Fallback for flat structure if no images are in the "images/" folder
        if (imageEntries.length === 0) {
            imageEntries = zipEntries.filter(entry =>
                !entry.isDirectory &&
                !entry.entryName.includes('/') &&
                /\.(png|jpg|jpeg|gif|webp)$/i.test(entry.entryName)
            );
        }

        if (imageEntries.length === 0) {
            await fs.remove(req.file.path);
            return res.status(400).json({ message: 'No images found in the "images/" folder or at the root of the zip file.' });
        }

        const newAdUrls: string[] = [];
        for (const entry of imageEntries) {
            const fileName = path.basename(entry.entryName);
            const targetPath = path.join(adAssetsDir, fileName);
            entry.getDataAsync((data, err) => {
                if (data) {
                    fs.writeFileSync(targetPath, data);
                }
            });
            newAdUrls.push(path.join('/upload/ads', fileName).replace(/\\/g, '/'));
        }

        appState.ads = newAdUrls;
        saveState();
        io.emit('state_update', appState);

        res.status(200).json({ message: `${newAdUrls.length} ad images imported successfully.`, ads: newAdUrls });

    } catch (e) {
        const error = e as Error;
        console.error("Failed to process ads zip:", error);
        res.status(500).json({ message: 'Error processing zip file.', error: error.message });
    } finally {
        if (req.file) {
            await fs.remove(req.file.path); // Clean up uploaded zip
        }
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 5e7 // 50MB
});

// --- SERVICES INITIALIZATION ---
const adbService = new AdbService();
adbService.setupForwarding();

const gameListener = new GameListener();

gameListener.on('status', (status: string) => {
    if (appState.status !== status) {
        appState.status = status;
        console.log(`Game connection status updated: ${status}`);
        io.emit('state_update', { status });
    }
});

gameListener.start(); // Starts connecting to localhost:12345

// --- LOGIC HELPER: Process Raw Game Data to AppState ---
const processGameData = (raw: GameData, currentState: AppState): Partial<AppState> => {
    const roomInfo = raw.data?.room_info;
    const players = roomInfo?.players || [];

    const syncControl = currentState.syncControl || INITIAL_STATE.syncControl;
    const blueTeamPlayers = players.filter((p: any) => p.iCamp === 1);
    const redTeamPlayers = players.filter((p: any) => p.iCamp === 2);

    const battleStats = raw.data?.battle_stats;

    const processSide = (sidePlayers: any[], currentTeam: TeamData, currentState: AppState, syncControl: SyncControl, sideKills: number): TeamData => {
        const resultingTeam = { ...currentTeam };

        // 1. Set Live Kills from API
        resultingTeam.kills = sideKills;

        // 2. Find a registered team match from the players on this side
        let teamIdToMatch: string | null = null;
        if (syncControl.isTeamNameSyncEnabled) {
            for (const p of sidePlayers) {
                if (!p._sName && !p.lUid) continue; // Skip empty player slots
                const pUid = String(p.lUid || '');
                const pName = String(p._sName || '').trim().toLowerCase();

                const regTeam = currentState.registry?.find(t => {
                    const leader = String(t.leaderId || '').trim().toLowerCase();
                    return (pUid && leader === pUid) || (pName && pName.length > 2 && leader === pName);
                });
                if (regTeam) {
                    teamIdToMatch = regTeam.name;
                    break;
                }
                const libTeam = currentState.teamLibrary?.find(t => {
                    const capId = String(t.captainId || '');
                    return pUid && capId === pUid;
                });
                if (libTeam) {
                    teamIdToMatch = libTeam.name;
                    break;
                }
            }
        }
        
        // 3. Process player-specific data
        const picks: string[] = Array(5).fill('');
        const bans: string[] = Array(5).fill('');
        const spells: string[] = Array(5).fill('');
        const lanes: string[] = Array(5).fill('');
        const pNames: string[] = Array(5).fill('').map((_, i) => `PLAYER ${i + 1}`);
        const pIds: string[] = Array(5).fill('');
        sidePlayers.forEach((p, idx) => {
            if (idx < 5) {
                if (syncControl.isPickSyncEnabled) picks[idx] = String(p.heroid || 0);
                if (syncControl.isBanSyncEnabled) bans[idx] = String(p.banHero || 0);
                spells[idx] = String(p.summonSkillId || 0);
                lanes[idx] = String(p.iRoad || 0);
                pNames[idx] = p._sName || `PLAYER ${idx + 1}`;
                pIds[idx] = String(p.lUid || '');
            }
        });
        resultingTeam.picks = picks;
        resultingTeam.bans = bans;
        resultingTeam.spells = spells;
        resultingTeam.lanes = lanes;
        resultingTeam.pNames = pNames;
        resultingTeam.pIds = pIds;

        // 4. Apply final name and logo based on match result
        if (syncControl.isTeamNameSyncEnabled) {
            let matchedName = "";

            if (teamIdToMatch) {
                // A registered team was found, so we ALWAYS use its data.
                const libTeam = currentState.teamLibrary?.find(t => t.name === teamIdToMatch);
                const regTeam = currentState.registry?.find(t => t.name === teamIdToMatch);
                if (regTeam) {
                    resultingTeam.name = regTeam.name;
                    resultingTeam.logo = regTeam.logo;
                    matchedName = regTeam.name;
                } else if (libTeam) {
                    resultingTeam.name = libTeam.name;
                    resultingTeam.logo = libTeam.logoUrl;
                    matchedName = libTeam.name;
                }
            } else {
                // No registered team found. Check previous name.
                const isCurrentNameRegistered = 
                    currentState.registry?.some(t => t.name === currentTeam.name) || 
                    currentState.teamLibrary?.some(t => t.name === currentTeam.name);

                if (isCurrentNameRegistered) {
                    resultingTeam.name = "NO TEAM";
                    resultingTeam.logo = "";
                } else {
                    // Keep manual name
                    matchedName = resultingTeam.name;
                }
            }

            // 5. Auto-Calculate Series Wins from History
            // Only recalculate if current series win count is 0 (start of match)
            if (matchedName && matchedName !== "NO TEAM" && matchedName !== "BLUE TEAM" && matchedName !== "RED TEAM" && resultingTeam.score === 0) {
                 const currentMatchTitle = currentState.game.matchTitle.trim();
                 if (currentMatchTitle) {
                     const wins = currentState.history?.filter(m => 
                        m.matchTitle === currentMatchTitle && 
                        (m.winner === 'blue' ? m.blue.name === matchedName : 
                         m.winner === 'red' ? m.red.name === matchedName : false)
                     ).length || 0;
                     
                     if (wins > 0) {
                         resultingTeam.score = wins;
                         console.log(`[AutoScore] ${matchedName} has ${wins} series wins in ${currentMatchTitle}`);
                     }
                 }
            }
        }

        return resultingTeam;
    };

    const newBlue = processSide(blueTeamPlayers, currentState.blue, currentState, syncControl, battleStats?.m_iCampAKill || 0);
    const newRed = processSide(redTeamPlayers, currentState.red, currentState, syncControl, battleStats?.m_iCampBKill || 0);

    const changes: Partial<AppState> = {};

    // Detect changes to reduce noise (optional, but good practice)
    if (JSON.stringify(newBlue) !== JSON.stringify(currentState.blue)) changes.blue = newBlue;
    if (JSON.stringify(newRed) !== JSON.stringify(currentState.red)) changes.red = newRed;

    // Timer sync
    if (battleStats && battleStats.time > 0) {
        if (currentState.game.timer !== Math.floor(battleStats.time)) {
             changes.game = { ...currentState.game, timer: Math.floor(battleStats.time) };
        }
    }

    return changes;
};

// Handle Game Data from Zygisk/GameListener
gameListener.on('data', (incoming: any) => {
    // Emit raw stream for debugging tools
    io.emit('debug_stream', incoming);

    // Merge logic to handle partial updates
    const current = appState.gameData || DEFAULT_GAME_DATA;
    
    const mergedData = { ...current };
    
    if (incoming.type) mergedData.type = incoming.type;
    if (incoming.debug) mergedData.debug = { ...mergedData.debug, ...incoming.debug };
    
    if (incoming.data) {
        // SMART MERGE FOR ROOM INFO
        const incomingRoom = incoming.data.room_info;
        const currentRoom = mergedData.data?.room_info;
        
        // If we have incoming room data
        if (incomingRoom) {
             // If incoming players is empty, but we have existing players, AND we are not in Lobby (state 0)
             // Then PRESERVE existing players to prevent flickering
             const incomingPlayers = incomingRoom.players || [];
             const currentPlayers = currentRoom?.players || [];
             const gameState = incoming.debug?.game_state ?? mergedData.debug?.game_state ?? 0;

             if (incomingPlayers.length === 0 && currentPlayers.length > 0 && gameState !== 0) {
                 // Keep old players, but update other room info if any
                 incomingRoom.players = currentPlayers;
                 incomingRoom.player_count = currentRoom ? currentRoom.player_count : 0; // Keep count too
             }
        }

        mergedData.data = {
            ...mergedData.data,
            ...incoming.data 
        };
    }

    // Update Internal GameData State
    appState.gameData = mergedData;

    // --- APPLY MAPPING LOGIC ---
    // Only apply if AutoSync is globally enabled (legacy check) OR if we rely on granular SyncControl
    // But since SyncControl is granular, we can just run it. SyncControl defaults to TRUE.
    if (appState.game.visibility.isAutoSync) {
        const mappedChanges = processGameData(mergedData, appState);

        // Merge mapped changes into AppState
        if (Object.keys(mappedChanges).length > 0) {
            appState = { ...appState, ...mappedChanges };
        }
    }

    // Broadcast FULL AppState update to clients (instead of just gameData)
    // This allows frontend to use state.blue/red directly
    io.emit('state_update', appState);

    io.emit('update', mergedData); // Keep legacy stream of raw data
});

io.on('connection', (socket) => {
    console.log('Client Connected:', socket.id);
    
    // Send initial state
    socket.emit('state_update', appState);

    // Handle Control Panel Updates
    socket.on('update_state', (newState: Partial<AppState>) => {
        // Deep merge function
        const merge = (target: any, source: any) => {
            if (!source || typeof source !== 'object') return source;
            if (!target || typeof target !== 'object') return source;

            const output = { ...target };
            Object.keys(source).forEach(key => {
                const sourceValue = source[key];
                const targetValue = output[key];
                if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) && targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
                    output[key] = merge(targetValue, sourceValue);
                } else {
                    output[key] = sourceValue;
                }
            });
            return output;
        };

        // Apply deep merge
        appState = merge(appState, newState);
        
        // --- AUTO-CALCULATE SCORE ON TITLE CHANGE ---
        if (newState.game && 'matchTitle' in newState.game) {
            const currentTitle = appState.game.matchTitle.trim();
            const blueName = appState.blue.name;
            const redName = appState.red.name;
            
            console.log(`[AutoScore] Match Title changed to "${currentTitle}". Recalculating scores...`);

            if (currentTitle) {
                // Calculate Blue Wins
                if (blueName && !["NO TEAM", "BLUE TEAM", "Computer"].includes(blueName)) {
                    const wins = appState.history.filter((m: any) => 
                        m.matchTitle === currentTitle && 
                        ((m.winner === 'blue' && m.blue.name === blueName) || 
                         (m.winner === 'red' && m.red.name === blueName)) // Handle swapping sides if needed, but usually winner stores the team
                    ).length;
                    
                    // Actually, the history stores snapshot. 
                    // Strict check: m.winner === 'blue' means the team in blue slot won.
                    // We need to check if THAT team is the current blue team.
                    
                    const blueWins = appState.history.filter((m: any) => 
                        m.matchTitle === currentTitle && 
                        (
                            (m.winner === 'blue' && m.blue.name === blueName) ||
                            (m.winner === 'red' && m.red.name === blueName)
                        )
                    ).length;
                    
                    appState.blue.score = blueWins;
                } else {
                    appState.blue.score = 0;
                }

                // Calculate Red Wins
                if (redName && !["NO TEAM", "RED TEAM", "Computer"].includes(redName)) {
                    const redWins = appState.history.filter((m: any) => 
                        m.matchTitle === currentTitle && 
                        (
                            (m.winner === 'blue' && m.blue.name === redName) ||
                            (m.winner === 'red' && m.red.name === redName)
                        )
                    ).length;
                    
                    appState.red.score = redWins;
                } else {
                    appState.red.score = 0;
                }
            }
        }

        saveState();
        
        // Broadcast to others (excluding sender)
        socket.broadcast.emit('state_update', appState);
    });

    socket.on('disconnect', () => {
        // console.log('Client Disconnected');
    });
});

// --- API Endpoints for Reset ---
app.get('/api/game-data', (req, res) => {
    res.json(appState.gameData || DEFAULT_GAME_DATA);
});

app.post('/api/reset', (req, res) => {
    console.log('Received request to reset state.');
    
    // Preserve persistent data that shouldn't be wiped on a simple reset
    const preserved = {
        registry: appState.registry,
        teamLibrary: appState.teamLibrary,
        history: appState.history,
        assets: appState.assets,
        syncControl: appState.syncControl,
        status: appState.status,
        gameData: appState.gameData,
        theme: appState.theme
    };

    // Reset state but keep preserved data
    appState = {
        ...INITIAL_STATE,
        registry: preserved.registry,
        teamLibrary: preserved.teamLibrary,
        history: preserved.history,
        assets: preserved.assets,
        syncControl: preserved.syncControl,
        theme: preserved.theme, // Preserve theme
        ...(preserved.gameData && { gameData: preserved.gameData }),
        ...(preserved.status && { status: preserved.status })
    };

    saveState();
    io.emit('state_update', appState); // Force all clients to update
    res.status(200).json({ message: 'State has been reset.' });
});

app.post('/api/factory-reset', async (req, res) => {
    console.log('!!! FACTORY RESET INITIATED !!!');
    try {
        // Reset in-memory state to pristine defaults
        appState = { ...INITIAL_STATE, ...(appState.status && { status: appState.status }) };
        io.emit('state_update', appState);

        // Delete configuration files
        await fs.remove(METADATA_FILE);
        await fs.remove(HISTORY_FILE);
        await fs.remove(VISIBILITY_FILE);
        console.log('Deleted config files.');

        // Clear uploaded team logos and ad assets
        const teamLogosDir = path.join(PUBLIC_DIR, 'assets', 'teams');
        await fs.emptyDir(teamLogosDir);
        await fs.emptyDir(UPLOAD_DIR);
        console.log('Cleared team logos and upload directories.');

        // Re-create cleared directories
        fs.ensureDirSync(UPLOAD_DIR);
        fs.ensureDirSync(teamLogosDir);
        
        saveState(); // This will create a fresh metadata.json

        res.status(200).json({ message: 'Factory reset successful.' });
    } catch (e) {
        const error = e as Error;
        console.error('Factory reset failed:', error);
        res.status(500).json({ message: 'Factory reset failed.', error: error.message });
    }
});

// --- API Endpoints for History ---
app.post('/api/save-history', (req, res) => {
    const matchData = req.body;
    if (!matchData) return res.status(400).json({ message: 'No data provided' });

    // Add ID and Date if missing
    const newMatch = {
        ...matchData,
        id: matchData.id || Date.now().toString(),
        date: matchData.date || new Date().toISOString()
    };

    appState.history.push(newMatch);
    saveState();
    io.emit('state_update', appState);
    
    res.status(200).json({ message: 'Match history saved', match: newMatch });
});

app.post('/api/update-history', (req, res) => {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ message: 'Match ID required' });

    const matchIndex = appState.history.findIndex((m: any) => m.id === id);
    if (matchIndex === -1) return res.status(404).json({ message: 'Match not found' });

    // Update specific fields
    appState.history[matchIndex] = { ...appState.history[matchIndex], ...updates };
    
    saveState();
    io.emit('state_update', appState);

    res.status(200).json({ message: 'Match updated', match: appState.history[matchIndex] });
});

app.post('/api/delete-history', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'Match ID required' });

    const initialLength = appState.history.length;
    appState.history = appState.history.filter((m: any) => m.id !== id);

    if (appState.history.length === initialLength) {
        return res.status(404).json({ message: 'Match not found' });
    }

    saveState();
    io.emit('state_update', appState);

    res.status(200).json({ message: 'Match deleted' });
});

// --- START SERVER ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ==================================================
    🚀 MLBS UNIFIED SERVER RUNNING
    ==================================================
    - API/Socket:   http://localhost:${PORT}
    - ADB Bridge:   Active (Listening on tcp:12345)
    - Public Dir:   ${PUBLIC_DIR}
    ==================================================
    `);
});