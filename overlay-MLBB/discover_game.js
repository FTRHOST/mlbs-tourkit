
import net from 'net';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, 'game_config.json');
const PORT_TO_SCAN = 5000;

console.log("--- MLBS Game Server Discovery Tool ---");
console.log("Scanning local network for port", PORT_TO_SCAN, "...");

const getSubnets = () => {
    const interfaces = os.networkInterfaces();
    const subnets = [];
    Object.keys(interfaces).forEach((ifname) => {
        interfaces[ifname]?.forEach((iface) => {
            if ('IPv4' === iface.family && !iface.internal) {
                const parts = iface.address.split('.');
                parts.pop();
                subnets.push(parts.join('.'));
            }
        });
    });
    return subnets;
};

const checkPort = (ip) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(400);
        socket.on('connect', () => {
            socket.destroy();
            resolve(ip);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(null);
        });
        socket.on('error', () => {
            resolve(null);
        });
        socket.connect(PORT_TO_SCAN, ip);
    });
};

const scan = async () => {
    const subnets = getSubnets();
    const promises = [];

    // Always check localhost
    promises.push(checkPort('127.0.0.1'));

    for (const subnet of subnets) {
        for (let i = 1; i < 255; i++) {
            promises.push(checkPort(`${subnet}.${i}`));
        }
    }

    const results = await Promise.all(promises);
    const foundIPs = results.filter(ip => ip !== null);

    if (foundIPs.length > 0) {
        const ip = foundIPs[0]; // Take the first one
        const url = `http://${ip}:${PORT_TO_SCAN}/api/data`;
        
        console.log(`
[SUCCESS] Game Server found at: ${ip}`);
        console.log(`Writing config to game_config.json...`);
        
        const config = { gameApiUrl: url };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        
        console.log(`
Config saved! The Overlay will now auto-connect to: ${url}`);
    } else {
        console.log("\n[FAILED] No Game Server found on port 5000.");
        console.log("Please make sure the Python relay script is running.");
    }
};

scan();
