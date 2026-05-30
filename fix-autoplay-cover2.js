const fs = require('fs');
let code = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8').replace(/\r\n/g, '\n');

const t = `                if (b64) {
                  (pptSlide as any).addMedia({
                    ...common,
                    type: 'video',
                    data: b64,
                  });
                }`;

const r = `                if (b64) {
                  (pptSlide as any).addMedia({
                    ...common,
                    type: 'video',
                    data: b64,
                    cover: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                  });
                }`;

if (code.includes(t)) {
  code = code.replace(t, r);
  fs.writeFileSync('src/lib/export/run-pptx-export.ts', code);
  console.log('Successfully injected transparent cover!');
} else {
  console.log('Could not find addMedia block!');
}
