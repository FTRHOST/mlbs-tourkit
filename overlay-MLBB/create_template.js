
import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createTemplate = () => {
    console.log("Generating template.zip...");

    // 1. Create Excel File
    const wb = XLSX.utils.book_new();
    const headers = [
        { "TeamName": "Team RRQ", "ShortName": "RRQ", "LogoFileName": "rrq.png", "CaptainID": "Lemon" },
        { "TeamName": "EVOS Legends", "ShortName": "EVOS", "LogoFileName": "evos.png", "CaptainID": "Rekt" },
        { "TeamName": "ONIC Esports", "ShortName": "ONIC", "LogoFileName": "onic.png", "CaptainID": "Sanz" }
    ];
    const ws = XLSX.utils.json_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, "Teams");
    
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 2. Zip it up
    const zip = new AdmZip();
    zip.addFile("teams.xlsx", excelBuffer);
    
    // Create 'logos' folder in zip
    // Copy existing logo if available for sample
    const sourceImage = path.join(__dirname, 'public/assets/logo.png');
    
    try {
        if (fs.existsSync(sourceImage)) {
            // Add as rrq.png, evos.png, etc for example
            zip.addLocalFile(sourceImage, "logos", "rrq.png");
            zip.addLocalFile(sourceImage, "logos", "evos.png");
            zip.addLocalFile(sourceImage, "logos", "onic.png");
        } else {
            // Create a dummy placeholder image (1x1 transparent pixel) or just text
            zip.addFile("logos/readme.txt", Buffer.from("Place your Team Logo PNGs here."));
        }
    } catch (e) {
        console.log("Warning: Could not add sample logos.", e);
        zip.addFile("logos/readme.txt", Buffer.from("Place your Team Logo PNGs here."));
    }

    const outputDir = path.join(__dirname, 'public');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    
    zip.writeZip(path.join(outputDir, 'template.zip'));
    console.log("Template created at public/template.zip");
};

createTemplate();
