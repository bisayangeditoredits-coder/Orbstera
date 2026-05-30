const fs = require('fs');
let code = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8').replace(/\r\n/g, '\n');

// The block to replace
const t = `              pptSlide.addImage({
                ...common,
                data: imgData,
                sizing: { type: 'cover', w: common.w, h: common.h },
                rounding: false,`;

const r = `              pptSlide.addImage({
                ...common,
                data: imgData,
                // Removed sizing: 'cover' to prevent image warping in PPTX
                // The w and h from 'common' already preserve the exact aspect ratio from the canvas
                rounding: false,`;

if (code.includes(t)) {
  code = code.replace(t, r);
  fs.writeFileSync('src/lib/export/run-pptx-export.ts', code);
  console.log('Fixed image warping by removing sizing: cover!');
} else {
  console.log('Target not found.');
}
