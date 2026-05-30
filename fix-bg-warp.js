const fs = require('fs');
let code = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8').replace(/\r\n/g, '\n');

// The block to replace for background images
const t = `          pptSlide.addImage({
            x: 0,
            y: 0,
            w: PPTX_W,
            h: PPTX_H,
            data: bgData,
            sizing: { type: 'cover', w: PPTX_W, h: PPTX_H },
          } as any);`;

const r = `          pptSlide.addImage({
            x: 0,
            y: 0,
            w: PPTX_W,
            h: PPTX_H,
            data: bgData,
            // Removed sizing: 'cover' to prevent background image warping 
            // AI-generated backgrounds are already 16:9
          } as any);`;

if (code.includes(t)) {
  code = code.replace(t, r);
  fs.writeFileSync('src/lib/export/run-pptx-export.ts', code);
  console.log('Fixed background image warping by removing sizing: cover!');
} else {
  console.log('Target not found for background image.');
}
