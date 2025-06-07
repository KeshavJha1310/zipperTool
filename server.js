// server.js
const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const archiver = require('archiver');
const path = require('path');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

app.post('/process', upload.array('files'), async (req, res) => {
    const folderName = req.body.folderName || `output_${Date.now()}`;
    const safeFolderName = folderName.replace(/[^a-z0-9_\-]/gi, '_'); 
    console.log(`Processing files for folder: ${safeFolderName}`);
    const outputDir = path.join(__dirname, 'processed', safeFolderName);
    console.log(`Output directory: ${outputDir} ${safeFolderName}`);
    const zipPath = path.join(__dirname, 'zips', `${safeFolderName}.zip`);
    console.log(`Zip path: ${zipPath} ${safeFolderName}.zip`);
    const renameList = JSON.parse(req.body.renameList);

    try {
        await fs.ensureDir(outputDir);

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const ext = path.extname(file.originalname).toLowerCase();
            const newBaseName = renameList[i];
            const newName = `${newBaseName}.png`;
            const destPath = path.join(outputDir, newName);

            if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
                await sharp(file.path).png().toFile(destPath);
            } else {
                await fs.copy(file.path, path.join(outputDir, `${newBaseName}${ext}`));
            }
        }

        await fs.ensureDir(path.dirname(zipPath));
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => res.download(zipPath));

        archive.pipe(output);
        archive.directory(outputDir, false);
        await archive.finalize();

    } catch (error) {
        console.error('Error processing files:', error);
        res.status(500).send('Internal server error');
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
