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
import type { AppState, TeamLibraryEntry, GameData } from './types.js';

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

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- SERVICES INITIALIZATION ---
const adbService = new AdbService();
adbService.setupForwarding();

const gameListener = new GameListener();
gameListener.start(); // Starts connecting to localhost:12345

// Handle Game Data from Zygisk/GameListener
gameListener.on('data', (incoming: any) => {
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
                 incomingRoom.player_count = currentRoom.player_count; // Keep count too
             }
        }

        mergedData.data = {
            ...mergedData.data,
            ...incoming.data 
        };
    }

    // Update Internal State
    appState.gameData = mergedData;

    // Broadcast MERGED update to clients
    io.emit('update', mergedData); 
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
                if (source[key] instanceof Object && key in target) {
                    output[key] = merge(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            });
            return output;
        };

        // Apply deep merge
        appState = merge(appState, newState);
        
        saveState();
        
        // Broadcast to others (excluding sender)
        socket.broadcast.emit('state_update', appState);
    });

    socket.on('disconnect', () => {
        // console.log('Client Disconnected');
    });
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