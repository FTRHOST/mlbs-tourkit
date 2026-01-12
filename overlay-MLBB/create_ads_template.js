
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createAdsTemplate = () => {
    console.log("Generating ads-template.zip...");

    const zip = new AdmZip();
    
    // Create dummy text file instructions
    zip.addFile("readme.txt", Buffer.from("Upload your Ad images (PNG/JPG) here. Ideally 1920x100 or similar aspect ratio for scrolling ticker."));

    // Try to add existing logo as a sample ad
    const sourceImage = path.join(__dirname, 'public/assets/logo.png');
    try {
        if (fs.existsSync(sourceImage)) {
            zip.addLocalFile(sourceImage, "", "sample-ad-1.png");
            zip.addLocalFile(sourceImage, "", "sample-ad-2.png");
        }
    } catch (e) {
        console.log("Warning: Could not add sample images.", e);
    }

    const outputDir = path.join(__dirname, 'public');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    
    zip.writeZip(path.join(outputDir, 'ads-template.zip'));
    console.log("Ads Template created at public/ads-template.zip");
};

createAdsTemplate();
