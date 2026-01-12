import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path, { dirname } from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AppState, TeamLibraryEntry } from './types.js';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import os from 'os';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3003;

// Helper function for deep merging objects
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };

  if (target && typeof target === 'object' && source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
          target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

// Path to metadata.json
const METADATA_FILE_PATH = path.join(__dirname, '..', 'metadata.json');
const HISTORY_FILE_PATH = path.join(__dirname, '..', 'history.json');
const VISIBILITY_FILE_PATH = path.join(__dirname, '..', 'visibility.json');
const GAME_CONFIG_PATH = path.join(__dirname, '..', 'game_config.json');

// INITIAL_STATE
const INITIAL_STATE: AppState = {
  blue: {
    name: 'MANSABA A',
    logo: '',
    picks: ['', '', '', '', ''],
    pNames: ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4', 'PLAYER 5'],
    pIds: ['', '', '', '', ''],
    bans: ['', '', '', '', ''],
    score: 0
  },
  red: {
    name: 'MANSABA B',
    logo: '',
    picks: ['', '', '', '', ''],
    pNames: ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4', 'PLAYER 5'],
    pIds: ['', '', '', '', ''],
    bans: ['', '', '', '', ''],
    score: 0
  },
  game: {
    matchTitle: 'MATCH DAY 1',
    phase: 'BANNING',
    timer: 30,
    turn: 'blue',
    isIntroActive: false,
    isGameControlEnabled: true,
    bestOf: 3,
    visibility: {
      phase: true,
      timer: true,
      turn: true,
      score: true,
      isAutoSync: false // NEW
    }
  },
  ads: ['AD 1', 'AD 2', 'AD 3'],
  adConfig: {
    type: 'images',
    effect: 'scroll',
    text: 'WELCOME TO THE TOURNAMENT! ENJOY THE MATCH!',
    speed: 25
  },
  assets: {
    union1: '',
    union2: '',
    logo: '',
    gradient: ''
  },
  registry: [],
  teamLibrary: [],
  history: []
};

let appState: AppState = { ...INITIAL_STATE };

// Load persistent visibility
let persistentVisibility = INITIAL_STATE.game.visibility;
try {
    if (fs.existsSync(VISIBILITY_FILE_PATH)) {
        persistentVisibility = fs.readJsonSync(VISIBILITY_FILE_PATH);
    }
} catch (e) {}
appState.game.visibility = persistentVisibility;

// Load History
try {
    if (fs.existsSync(HISTORY_FILE_PATH)) {
        appState.history = fs.readJsonSync(HISTORY_FILE_PATH);
    }
} catch (e) {}

// Load metadata.json and merge with INITIAL_STATE
try {
  if (fs.existsSync(METADATA_FILE_PATH)) {
    const metadataContent = fs.readFileSync(METADATA_FILE_PATH, 'utf8');
    const metadata = JSON.parse(metadataContent);
    appState = deepMerge(INITIAL_STATE, metadata) as AppState;
    appState.game.visibility = persistentVisibility;
    if (fs.existsSync(HISTORY_FILE_PATH)) {
        appState.history = fs.readJsonSync(HISTORY_FILE_PATH);
    }
    console.log('metadata.json loaded and merged with initial state.');
  }
} catch (error) {
  console.error('Error loading or parsing metadata.json:', error);
}

// Function to save state to metadata.json
const saveState = () => {
  try {
    fs.writeFileSync(METADATA_FILE_PATH, JSON.stringify(appState, null, 2), 'utf8');
    if (JSON.stringify(appState.game.visibility) !== JSON.stringify(persistentVisibility)) {
        persistentVisibility = appState.game.visibility;
        fs.writeJsonSync(VISIBILITY_FILE_PATH, persistentVisibility, { spaces: 2 });
    }
  } catch (error) {
    console.error('Error saving state to metadata.json:', error);
  }
};

app.use(cors());

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'public', 'upload');
    fs.ensureDirSync(uploadPath); // Ensure directory exists
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const newFilename = Date.now() + '-' + file.originalname;
    cb(null, newFilename);
  }
});

const upload = multer({ storage: storage });

// Endpoint to reset state (Match Reset)
app.post('/reset', (req, res) => {
  console.log('Match State has been reset (Preserving data/history)');
  
  // 1. Try to load visibility from file or keep current
  let visibilityToKeep = appState.game?.visibility;
  if (!visibilityToKeep) {
      try {
          if (fs.existsSync(VISIBILITY_FILE_PATH)) {
              visibilityToKeep = fs.readJsonSync(VISIBILITY_FILE_PATH);
          }
      } catch(e) {}
  }
  if (!visibilityToKeep) visibilityToKeep = INITIAL_STATE.game.visibility;

  // Preserve persistent data
  const preservedData = {
      history: appState.history,
      registry: appState.registry,
      teamLibrary: appState.teamLibrary,
      ads: appState.ads,
      adConfig: appState.adConfig,
      assets: appState.assets
  };

  appState = { 
      ...INITIAL_STATE,
      ...preservedData,
      game: {
          ...INITIAL_STATE.game,
          visibility: visibilityToKeep
      }
  };
  
  // Ensure persistent vars are sync
  persistentVisibility = visibilityToKeep;
  
  saveState();
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(appState));
    }
  });
  res.status(200).send({ message: 'Match reset successfully.' });
});

// Endpoint to FACTORY RESET (Wipe Everything)
app.post('/api/factory-reset', async (req, res) => {
    console.log('WARNING: FACTORY RESET INITIATED');
    
    try {
        // 1. Reset Memory State
        appState = { ...INITIAL_STATE };
        persistentVisibility = INITIAL_STATE.game.visibility;

        // 2. Delete Config Files
        if (fs.existsSync(METADATA_FILE_PATH)) fs.unlinkSync(METADATA_FILE_PATH);
        if (fs.existsSync(HISTORY_FILE_PATH)) fs.unlinkSync(HISTORY_FILE_PATH);
        if (fs.existsSync(VISIBILITY_FILE_PATH)) fs.unlinkSync(VISIBILITY_FILE_PATH);
        // game_config.json is environment config, maybe keep it? User said "reset semuanya".
        // Usually factory reset clears user data. Game URL is config. Let's clear it too to be safe.
        if (fs.existsSync(GAME_CONFIG_PATH)) fs.unlinkSync(GAME_CONFIG_PATH);

        // 3. Clear Uploaded Assets (Logos)
        const uploadDir = path.join(__dirname, '..', 'public', 'upload');
        await fs.emptyDir(uploadDir);

        // 4. Save clean state
        saveState();

        // 5. Broadcast
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(appState));
            }
        });

        res.json({ success: true, message: 'Factory Reset Complete. System is clean.' });
    } catch (e: any) {
        console.error("Factory Reset Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint to save match history
app.post('/api/save-history', express.json(), async (req, res) => {
  try {
    const matchData = req.body;
    if (!matchData) return res.status(400).send('No data provided');

    const entry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...matchData
    };

    let history = [];
    if (await fs.pathExists(HISTORY_FILE_PATH)) {
      history = await fs.readJson(HISTORY_FILE_PATH);
    }
    
    history.push(entry);
    await fs.writeJson(HISTORY_FILE_PATH, history, { spaces: 2 });
    
    appState.history = history;
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(appState));
      }
    });
    
    console.log('Match history saved:', entry.id);
    res.json({ success: true, id: entry.id });
  } catch (e: any) {
    console.error('Error saving history:', e);
    res.status(500).json({ error: e.message });
  }
});

// Network Scan Endpoint
app.get('/api/scan-network', async (req, res) => {
  const interfaces = os.networkInterfaces();
  const subnets: string[] = [];

  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname]?.forEach((iface) => {
      if ('IPv4' === iface.family && !iface.internal) {
        const parts = iface.address.split('.');
        parts.pop();
        subnets.push(parts.join('.'));
      }
    });
  });

  const foundDevices: { ip: string, status: string }[] = [];
  const portToScan = 5000;

  const checkPort = (ip: string) => {
    return new Promise<void>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => {
        foundDevices.push({ ip, status: 'open' });
        socket.destroy();
        resolve();
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        resolve();
      });
      socket.connect(portToScan, ip);
    });
  };

  const scanPromises: (() => Promise<void>)[] = [];
  
  scanPromises.push(() => checkPort('127.0.0.1'));

  for (const subnet of subnets) {
    for (let i = 1; i < 255; i++) {
      const ip = `${subnet}.${i}`;
      if (ip !== '127.0.0.1') {
         scanPromises.push(() => checkPort(ip));
      }
    }
  }

  const CHUNK_SIZE = 50;
  for (let i = 0; i < scanPromises.length; i += CHUNK_SIZE) {
      const chunk = scanPromises.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(task => task()));
  }

  res.json({ success: true, devices: foundDevices });
});

// Proxy Endpoint
app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: `Target API returned ${response.status}` });
        }
        const data = await response.json();
        res.json(data);
    } catch (e: any) {
        console.error('Proxy Error:', e.message);
        res.status(500).json({ error: 'Failed to fetch from target URL', details: e.message });
    }
});

app.get('/api/config/game-url', (req, res) => {
    try {
        if (fs.existsSync(GAME_CONFIG_PATH)) {
            const config = fs.readJsonSync(GAME_CONFIG_PATH);
            res.json(config);
        } else {
            res.json({ gameApiUrl: 'http://localhost:5000/api/data' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to read config' });
    }
});

// Import Teams Endpoint
app.post('/api/import-teams', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const zipPath = req.file.path;
  const extractPath = path.join(__dirname, '..', 'temp_extract');
  const publicAssetsPath = path.join(__dirname, '..', 'public/assets/teams');

  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const files = fs.readdirSync(extractPath);
    const excelFile = files.find(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    
    if (!excelFile) {
        throw new Error('File Excel (.xlsx/.xls) tidak ditemukan dalam ZIP');
    }

    const workbook = XLSX.readFile(path.join(extractPath, excelFile));
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const teams: TeamLibraryEntry[] = [];
    await fs.ensureDir(publicAssetsPath);

    let logosPath = path.join(extractPath, 'logos');
    if (!fs.existsSync(logosPath)) {
        const subDirs = fs.readdirSync(extractPath).filter(f => fs.statSync(path.join(extractPath, f)).isDirectory());
        if (subDirs.length > 0 && fs.existsSync(path.join(extractPath, subDirs[0], 'logos'))) {
            logosPath = path.join(extractPath, subDirs[0], 'logos');
        }
    }

    for (const row of rawData as any[]) {
      const teamName = row['TeamName'] || row['Nama Tim'];
      const shortName = row['ShortName'] || row['Singkatan'] || teamName.substring(0, 3).toUpperCase();
      const logoFileName = row['LogoFileName'] || row['File Logo'];
      const captainId = row['CaptainID'] || row['ID Kapten'];

      if (teamName) {
          let logoUrl = '';
          if (logoFileName && fs.existsSync(logosPath)) {
              const sourceLogo = path.join(logosPath, logoFileName);
              const destLogo = path.join(publicAssetsPath, logoFileName);
              
              if (fs.existsSync(sourceLogo)) {
                  await fs.move(sourceLogo, destLogo, { overwrite: true });
                  logoUrl = `assets/teams/${logoFileName}`;
              }
          }

          teams.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name: teamName,
            shortName: shortName,
            logoUrl: logoUrl,
            captainId: captainId ? String(captainId) : undefined
          });
      }
    }

    appState.teamLibrary = teams;
    saveState();

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(appState));
        }
    });

    await fs.remove(extractPath);
    await fs.remove(zipPath);

    res.json({ success: true, message: `${teams.length} tim berhasil diimpor`, data: teams });

  } catch (error: any) {
    console.error('Import error:', error);
    if (fs.existsSync(extractPath)) await fs.remove(extractPath);
    if (fs.existsSync(zipPath)) await fs.remove(zipPath);
    res.status(500).send({ message: 'Gagal memproses file', error: error.message });
  }
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const filePath = `/upload/${req.file.filename}`;
  const { field, team, index } = req.body;
  if (field === 'logo' && (team === 'blue' || team === 'red')) {
      appState[team].logo = filePath;
  } else if (field === 'asset_logo') {
      appState.assets.logo = filePath;
  }
  saveState();
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(appState));
    }
  });
  res.send({ message: 'File uploaded and state updated.', filePath: filePath });
});

app.use('/upload', express.static(path.join(__dirname, '..', 'public', 'upload')));
app.use(express.static(__dirname));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.send(JSON.stringify(appState));
  ws.on('message', (message) => {
    try {
      const receivedState = JSON.parse(message.toString());
      appState = receivedState;
      saveState();
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(appState));
        }
      });
    } catch (e) {
      console.error('Failed to parse message or broadcast:', e);
    }
  });
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server with WebSocket is running on http://0.0.0.0:${port}`);
});