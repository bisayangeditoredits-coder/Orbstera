const fs = require('fs');

let content = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8');

// 1. Add pptSlidesInfo array
content = content.replace(
  /const imgMap = new Map<string, string>\(\);\s*for \(const t of imgTasks\) \{[\s\S]*?\}\s*\/\/\s*── Build each slide ──/m,
  `const imgMap = new Map<string, string>();
    for (const t of imgTasks) {
      const data = urlToData.get(t.url);
      if (data) imgMap.set(\`\${t.slideIdx}:\${t.elementId}\`, data);
    }

    const pptSlidesInfo: { bgShapeCount: number; exportedElements: any[] }[] = [];

    // ── Build each slide ──`
);

// 2. Track elements in the loop
content = content.replace(
  /if \(isSlideDeckBackgroundImage\(el\)\) continue;\s*const _placement = elementPlacement\(el\);/m,
  `if (isSlideDeckBackgroundImage(el)) continue;

        exportedElements.push(el);

        const _placement = elementPlacement(el);`
);

// 3. Inject Video inside the IMAGE block
content = content.replace(
  /\/\/\s*── IMAGE \/ ICON ──[\s\S]*?\} else \{\s*console\.warn\('\[pptx-export\] missing image on slide'[\s\S]*?\}\s*\}/m,
  `// ── IMAGE / VIDEO / ICON ─────────────────────────────────────────
        else if (
          (el.type === 'image' || el.type === 'icon') &&
          el.src &&
          !el.aiImagePending
        ) {
          const isVideo = el.src.includes('youtube.com') || el.src.includes('youtu.be') || el.src.split('?')[0].endsWith('.mp4') || el.src.split('?')[0].endsWith('.mov');
          
          if (isVideo) {
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
          } else {
            // Regular Image
            const imgData =
              imgMap.get(\`\${si}:\${el.id}\`) || (await fetchImageAsBase64ForExport(el.src));

            if (imgData) {
              const imageTransparency = combinedShapeTransparency(undefined, el.opacity);
              pptSlide.addImage({
                ...common,
                data: imgData,
                sizing: { type: 'cover', w: common.w, h: common.h },
                rounding: false,
                ...(imageTransparency !== undefined
                  ? { transparency: imageTransparency }
                  : {}),
              } as any);
            } else {
              console.warn('[pptx-export] missing image on slide', si + 1, el.id, (el.src || '').slice(0, 80));
            }
          }
        }`
);

// 4. Save pptSlidesInfo
content = content.replace(
  /\]\.filter\(Boolean\)\.join\('\\n\\n'\);\s*if \(notes\) pptSlide\.addNotes\(notes\);\s*\}\s*\/\/\s*── Watermark: inject on every slide/m,
  `].filter(Boolean).join('\\n\\n');
      if (notes) pptSlide.addNotes(notes);

      pptSlidesInfo.push({ bgShapeCount, exportedElements });
    }

    // ── Watermark: inject on every slide`
);

// 5. Post-processors
content = content.replace(
  /\/\/\s*── Inject entrance animations via OOXML post-processing ──[\s\S]*?const finalBuffer = buffer; \/\/ Use the safe, unpatched buffer/m,
  `// ── Inject entrance animations via OOXML post-processing ─────────────────
    let finalBuffer = buffer;
    if (pptSlidesInfo.length > 0) {
      finalBuffer = await injectAnimations(finalBuffer, pptSlidesInfo);
      finalBuffer = await injectVideoAutoplay(finalBuffer);
    }`
);

fs.writeFileSync('src/lib/export/run-pptx-export.ts', content);
console.log('Fixed export file using AST/regex!');
