const fs = require('fs');
let code = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8').replace(/\r\n/g, '\n');

const t = \        // -- IMAGE / ICON --------------------------------------------------
        else if (
          (el.type === 'image' || el.type === 'icon') &&
          el.src &&
          !el.aiImagePending
        ) {
          const imgData =
            imgMap.get(\\\\:\\\\) || (await fetchImageAsBase64ForExport(el.src));

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

        // -- VIDEO ---------------------------------------------------------
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
        }\.replace(/\r\n/g, '\n');

const r = \        // -- IMAGE / VIDEO / ICON -----------------------------------------
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
              imgMap.get(\\\\:\\\\) || (await fetchImageAsBase64ForExport(el.src));

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
        }\.replace(/\r\n/g, '\n');

if (code.includes(t)) {
  code = code.replace(t, r);
  fs.writeFileSync('src/lib/export/run-pptx-export.ts', code);
  console.log('Fixed video type!');
} else {
  console.log('Failed to find block');
}
