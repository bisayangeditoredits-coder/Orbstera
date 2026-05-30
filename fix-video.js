const fs = require('fs');
let code = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8');

const t1 = `    const imgMap = new Map<string, string>();
    for (const t of imgTasks) {
      const data = urlToData.get(t.url);
      if (data) imgMap.set(\`\${t.slideIdx}:\${t.elementId}\`, data);
    }

    // ── Build each slide ──────────────────────────────────────────────────────`;
const r1 = `    const imgMap = new Map<string, string>();
    for (const t of imgTasks) {
      const data = urlToData.get(t.url);
      if (data) imgMap.set(\`\${t.slideIdx}:\${t.elementId}\`, data);
    }

    const pptSlidesInfo: { bgShapeCount: number; exportedElements: any[] }[] = [];

    // ── Build each slide ──────────────────────────────────────────────────────`;

const t2 = `        if (isSlideDeckBackgroundImage(el)) continue;

        const _placement = elementPlacement(el);`;
const r2 = `        if (isSlideDeckBackgroundImage(el)) continue;

        exportedElements.push(el);

        const _placement = elementPlacement(el);`;

const t3 = `          } else {
            console.warn('[pptx-export] missing image on slide', si + 1, el.id, (el.src || '').slice(0, 80));
          }
        }

        // ── FREEHAND DRAW ─────────────────────────────────────────────────`;
const r3 = `          } else {
            console.warn('[pptx-export] missing image on slide', si + 1, el.id, (el.src || '').slice(0, 80));
          }
        }

        // ── VIDEO ─────────────────────────────────────────────────────────
        else if (el.type === 'video' && el.src) {
          try {
            if (el.src.includes('youtube.com') || el.src.includes('youtu.be')) {
              (pptSlide as any).addMedia({
                ...common,
                type: 'online',
                link: el.src,
              });
            } else {
              let videoUrl = el.src;
              if (videoUrl.includes('?') && !videoUrl.includes('read-asset')) {
                videoUrl = videoUrl.split('?')[0];
              }
              const b64 = await fetchVideoAsBase64ForExport(el.src);
              if (b64) {
                (pptSlide as any).addMedia({
                  ...common,
                  type: 'video',
                  data: b64,
                });
              }
            }
          } catch (e) {
            console.error('[pptx-export] video insertion failed:', e);
          }
        }

        // ── FREEHAND DRAW ─────────────────────────────────────────────────`;

const t4 = `      ].filter(Boolean).join('\\n\\n');
      if (notes) pptSlide.addNotes(notes);
    }

    // ── Watermark: inject on every slide for Free users ──────────────────────`;
const r4 = `      ].filter(Boolean).join('\\n\\n');
      if (notes) pptSlide.addNotes(notes);

      pptSlidesInfo.push({ bgShapeCount, exportedElements });
    }

    // ── Watermark: inject on every slide for Free users ──────────────────────`;

const t5 = `    // ── Inject entrance animations via OOXML post-processing ─────────────────
    // Temporarily disabled: The experimental OOXML patching caused shape ID mismatches,
    // resulting in missing elements (black boxes) in the exported PPTX.
    

    const finalBuffer = buffer; // Use the safe, unpatched buffer`;
const r5 = `    // ── Inject entrance animations via OOXML post-processing ─────────────────
    let finalBuffer = buffer;
    if (pptSlidesInfo.length > 0) {
      finalBuffer = await injectAnimations(finalBuffer, pptSlidesInfo);
      finalBuffer = await injectVideoAutoplay(finalBuffer);
    }`;

let missing = false;
if (!code.includes(t1)) { console.log('T1 missing'); missing = true; }
if (!code.includes(t2)) { console.log('T2 missing'); missing = true; }
if (!code.includes(t3)) { console.log('T3 missing'); missing = true; }
if (!code.includes(t4)) { console.log('T4 missing'); missing = true; }
if (!code.includes(t5)) { console.log('T5 missing'); missing = true; }

if (!missing) {
    code = code.replace(t1, r1);
    code = code.replace(t2, r2);
    code = code.replace(t3, r3);
    code = code.replace(t4, r4);
    code = code.replace(t5, r5);
    fs.writeFileSync('src/lib/export/run-pptx-export.ts', code);
    console.log('Replacements applied successfully!');
} else {
    console.log('Aborting due to missing targets');
}
