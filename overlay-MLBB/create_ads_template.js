
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createAdsTemplate = () => {
    console.log("Generating ads-template.zip...");

    const zip = new AdmZip();
    
    // Create an 'images' directory in the zip and add a readme file.
    const readmeContent = "Place all your ad images (e.g., sponsor logos) inside this 'images' folder.\nSupported formats are PNG, JPG, GIF, WebP.";
    zip.addFile("images/readme.txt", Buffer.from(readmeContent));

    // Try to add an existing logo as a sample ad inside the 'images' folder
    const sourceImage = path.join(__dirname, 'public/assets/logo.png');
    try {
        if (fs.existsSync(sourceImage)) {
            zip.addLocalFile(sourceImage, "images", "sample-sponsor-logo.png");
        }
    } catch (e) {
        console.log("Warning: Could not add a sample ad image.", e);
    }

    const outputDir = path.join(__dirname, 'public');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    
    zip.writeZip(path.join(outputDir, 'ads-template.zip'));
    console.log("Ads Template created at public/ads-template.zip");
};

createAdsTemplate();
