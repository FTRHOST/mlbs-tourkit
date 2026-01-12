
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

    // 2. Create Dummy Logos (Just empty pngs or copies of existing assets)
    // We will just create 1x1 pixel PNGs or text files acting as placeholders if real images aren't available easily.
    // Or better, let's copy the existing 'logo.png' from assets if it exists.
    
    // 3. Zip it up
    const zip = new AdmZip();
    zip.addFile("teams.xlsx", excelBuffer);
    
    // Create 'logos' folder in zip
    // We try to find a source image to put in there
    const sourceImage = path.join(__dirname, 'public/assets/logo.png');
    if (fs.existsSync(sourceImage)) {
        zip.addLocalFile(sourceImage, "logos", "rrq.png");
        zip.addLocalFile(sourceImage, "logos", "evos.png");
        zip.addLocalFile(sourceImage, "logos", "onic.png");
    } else {
        // Fallback: Create a dummy text file
        zip.addFile("logos/readme.txt", Buffer.from("Put your PNG files here."));
    }

    const outputDir = path.join(__dirname, 'public');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    
    zip.writeZip(path.join(outputDir, 'template.zip'));
    console.log("Template created at public/template.zip");
};

createTemplate();
