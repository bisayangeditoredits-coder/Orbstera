import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve('public');
const MAX_SIZE_KB = 100;

async function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      await processDirectory(fullPath);
    } else if (stat.isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        const sizeKb = stat.size / 1024;
        if (sizeKb > MAX_SIZE_KB) {
          console.log(`Compressing ${fullPath} (${sizeKb.toFixed(2)} KB)...`);
          try {
            const buffer = fs.readFileSync(fullPath);
            const image = sharp(buffer);
            const metadata = await image.metadata();
            
            // Resize if too large
            let op = image;
            if (metadata.width > 1200) {
              op = op.resize({ width: 1200, withoutEnlargement: true });
            }
            
            if (ext === '.png') {
              op = op.png({ quality: 70, compressionLevel: 9, palette: true });
            } else {
              op = op.jpeg({ quality: 75 });
            }
            
            const outputBuffer = await op.toBuffer();
            fs.writeFileSync(fullPath, outputBuffer);
            
            const newSizeKb = outputBuffer.length / 1024;
            console.log(` -> Reduced to ${newSizeKb.toFixed(2)} KB (Saved ${((sizeKb - newSizeKb) / sizeKb * 100).toFixed(1)}%)`);
          } catch (e) {
            console.error(`Failed to compress ${fullPath}:`, e);
          }
        }
      }
    }
  }
}

async function main() {
  console.log('Starting compression...');
  await processDirectory(PUBLIC_DIR);
  console.log('Done!');
}

main();
