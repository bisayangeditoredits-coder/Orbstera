const fs = require('fs');

function run() {
  const file = 'src/lib/export/run-pptx-export.ts';
  let c = fs.readFileSync(file, 'utf8');

  // Strip old injectAnimations and getPresetId
  const oldFuncIdx = c.indexOf('async function injectAnimations(');
  if (oldFuncIdx !== -1) {
    // Also remove the preceding comment
    const commentIdx = c.lastIndexOf('// ── Post-process', oldFuncIdx);
    c = c.substring(0, commentIdx !== -1 ? commentIdx : oldFuncIdx);
  }

  // 1. Add video import
  c = c.replace(
    `import { fetchImageAsBase64ForExport } from '@/lib/export/export-image';`,
    `import { fetchImageAsBase64ForExport, fetchVideoAsBase64ForExport } from '@/lib/export/export-image';`
  );

  // 1b. Add SlideElement import
  c = c.replace(
    `import { PresentationData, Slide, SlideTransition } from '@/types';`,
    `import { PresentationData, Slide, SlideTransition, SlideElement } from '@/types';`
  );

  // 2. Add bgShapeCount logic to bgEl handling (lines 350-370)
  c = c.replace(
    `const bgEl = findDeckBackgroundElement(slide.elements);`,
    `const bgEl = findDeckBackgroundElement(slide.elements);\n\n      let bgShapeCount = 0;`
  );
  c = c.replace(
    `pptSlide.addImage({`,
    `bgShapeCount++;\n          pptSlide.addImage({`
  );
  c = c.replace(
    `pptSlide.addShape(pptx.ShapeType.rect, {`,
    `pptSlide.addShape(pptx.ShapeType.rect, {\n              objectName: 'bg-overlay',`
  );

  // 3. Add exportedElements array
  c = c.replace(
    `// ── 4. Elements ────────────────────────────────────────────────────────`,
    `// ── 4. Elements ────────────────────────────────────────────────────────\n      const exportedElements: SlideElement[] = [];`
  );

  // 4. Update element placement objectName (if necessary) - not strictly necessary since we map by el.id anyway
  c = c.replace(
    `const common = elementPlacement(el);`,
    `const _placement = elementPlacement(el);\n        const common = { ..._placement, w: _placement.w as number, h: _placement.h as number, objectName: el.id };`
  );

  // 5. Replace the entire IMAGE / ICON block with IMAGE / ICON / VIDEO
  const oldImgBlock = `        // ── IMAGE / ICON ──────────────────────────────────────────────────
        else if (
          (el.type === 'image' || el.type === 'icon') &&
          el.src &&
          !el.aiImagePending
        ) {
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
        }`;
        
  const newImgBlock = `        // ── IMAGE / ICON / VIDEO ──────────────────────────────────────────────────
        else if (
          (el.type === 'image' || el.type === 'icon') &&
          el.src &&
          !el.aiImagePending
        ) {
          if (el.src.includes('youtube.com/embed/') || el.src.includes('youtu.be/')) {
            pptSlide.addMedia({ type: 'online', link: el.src, ...common });
            exportedElements.push(el);
            continue;
          }

          const srcLower = el.src.split('?')[0].split('#')[0].toLowerCase();
          if (srcLower.endsWith('.mp4') || srcLower.endsWith('.mov') || srcLower.endsWith('.webm')) {
            console.log('[pptx-export] embedding video', el.id, el.src.slice(0, 80));
            const videoData = await fetchVideoAsBase64ForExport(el.src);
            if (videoData) {
              pptSlide.addMedia({ type: 'video', data: videoData, ...common } as any);
              exportedElements.push(el);
            }
            continue;
          }

          const imgData = imgMap.get(\`\${si}:\${el.id}\`) || (await fetchImageAsBase64ForExport(el.src));
          if (imgData) {
            const imageTransparency = combinedShapeTransparency(undefined, el.opacity);
            pptSlide.addImage({
              ...common,
              data: imgData,
              sizing: { type: 'cover', w: common.w, h: common.h },
              rounding: false,
              ...(imageTransparency !== undefined ? { transparency: imageTransparency } : {}),
            } as any);
            exportedElements.push(el);
          }
        }`;
  c = c.replace(oldImgBlock, newImgBlock);

  // 6. Fix DRAW points and add push
  const oldDrawBlock = `        // ── FREEHAND DRAW ─────────────────────────────────────────────────
        else if (el.type === 'draw' && el.points && el.points.length >= 4) {
          const pts = el.points.map((p) => px(p));
          const strokeParsed = parseColorForPptx(el.shapeStyle?.stroke || el.shapeStyle?.fill || '#38BDF8');
          pptSlide.addShape(pptx.ShapeType.line, {
            ...common,
            line: {
              color: strokeParsed.color,
              pt: el.shapeStyle?.strokeWidth || 3,
              transparency: strokeParsed.transparency,
            },
            points: pts,
          } as any);
        }`;
        
  const newDrawBlock = `        // ── FREEHAND DRAW ─────────────────────────────────────────────────
        else if (el.type === 'draw' && el.points && el.points.length >= 4) {
          // BUG-15 fix: map flat [x,y,x,y] array to {x,y} array for pptxgenjs
          const pts = [];
          for (let i = 0; i < el.points.length; i += 2) {
             pts.push({ x: px(el.points[i]), y: px(el.points[i+1]) });
          }
          const strokeParsed = parseColorForPptx(el.shapeStyle?.stroke || el.shapeStyle?.fill || '#38BDF8');
          pptSlide.addShape(pptx.ShapeType.line, {
            ...common,
            line: {
              color: strokeParsed.color,
              pt: el.shapeStyle?.strokeWidth || 3,
              transparency: strokeParsed.transparency,
            },
            points: pts,
          } as any);
          exportedElements.push(el);
        }`;
  c = c.replace(oldDrawBlock, newDrawBlock);

  // 7. Add push for TEXT
  c = c.replace(
    `charSpacing:        ts.letterSpacing || 0,
            lineSpacingMultiple: ts.lineHeight || 1.4,
            autoFit:            false,
          });`,
    `charSpacing:        ts.letterSpacing || 0,
            lineSpacingMultiple: ts.lineHeight || 1.4,
            autoFit:            false,
          });
          exportedElements.push(el);`
  );

  // 8. Add push for Shape PATH
  c = c.replace(
    `pptSlide.addImage({
                ...common,
                data: pathData,
                sizing: { type: 'contain', w: common.w, h: common.h },
              });`,
    `pptSlide.addImage({
                ...common,
                data: pathData,
                sizing: { type: 'contain', w: common.w, h: common.h },
              });
              exportedElements.push(el);`
  );

  // 9. Add push for Shape LINE/ARROW
  c = c.replace(
    `line: { color: lineColor, pt: ss.strokeWidth || 4 },
                fill: fillParsed ? { type: 'solid', color: fillParsed.color } : undefined,
              } as any,
            );`,
    `line: { color: lineColor, pt: ss.strokeWidth || 4 },
                fill: fillParsed ? { type: 'solid', color: fillParsed.color } : undefined,
              } as any,
            );
            exportedElements.push(el);`
  );

  // 10. Add push for Shape OTHER
  c = c.replace(
    `rectRadius:
              el.shapeType === 'rect' && ss.cornerRadius ? ss.cornerRadius / 100 : undefined,
          } as any);`,
    `rectRadius:
              el.shapeType === 'rect' && ss.cornerRadius ? ss.cornerRadius / 100 : undefined,
          } as any);
          exportedElements.push(el);`
  );

  // 11. Add _orbsteraMeta
  c = c.replace(
    `if (notes) pptSlide.addNotes(notes);
    }`,
    `if (notes) pptSlide.addNotes(notes);\n\n      // Save metadata for injectAnimations\n      (pptSlide as any)._orbsteraMeta = { bgShapeCount: bgShapeCount || 0, exportedElements };\n    }`
  );

  // 12. Hook up post-processing injectors
  c = c.replace(
    `// const xmlStr = await injectAnimations(buffer, slides, palette);`,
    ``
  );
  c = c.replace(
    `const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;

    if (jobId) {`,
    `const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;

    // ── Inject entrance animations then video autoplay via OOXML post-processing ──
    const pptSlidesInfo = ((pptx as any).slides || []).map((s: any) =>
      s._orbsteraMeta || { bgShapeCount: 0, exportedElements: [] }
    );
    const animatedBuffer = await injectAnimations(buffer, pptSlidesInfo);
    const finalBuffer    = await injectVideoAutoplay(animatedBuffer);

    if (jobId) {`
  );

  c = c.replace(
    `Body: Buffer.from(buffer),`,
    `Body: Buffer.from(finalBuffer),`
  );
  
  c = c.replace(
    `return { mode: 'download', buffer, fileName: \`\${safeTitle}.pptx\` };`,
    `return { mode: 'download', buffer: finalBuffer, fileName: \`\${safeTitle}.pptx\` };`
  );

  // 13. Append injectors
  const injectors = `
// ── Post-process: Inject OOXML animations into the pptx buffer ────────────────
async function injectAnimations(
  buffer: ArrayBuffer,
  pptSlidesInfo: { bgShapeCount: number; exportedElements: SlideElement[] }[],
): Promise<ArrayBuffer> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip   = await JSZip.loadAsync(buffer);

    for (let si = 0; si < pptSlidesInfo.length; si++) {
      const slideFile = zip.file(\`ppt/slides/slide\${si + 1}.xml\`);
      if (!slideFile) continue;

      let xml = await slideFile.async('string');

      const shapeIdMap = new Map<string, number>();
      const cNvPrRe = /<p:cNvPr\\s([^>]+)>/g;
      let m;
      while ((m = cNvPrRe.exec(xml)) !== null) {
        const attrs = m[1];
        const idM   = /\\bid="(\\d+)"/.exec(attrs);
        const nameM = /\\bname="([^"]+)"/.exec(attrs);
        if (idM && nameM) {
          const id   = parseInt(idM[1], 10);
          const name = nameM[1];
          if (id > 1 && name) shapeIdMap.set(name, id);
        }
      }

      if (shapeIdMap.size === 0) continue;
      const meta = pptSlidesInfo[si];
      if (!meta) continue;
      const { exportedElements } = meta;

      const hasAnyAnim = exportedElements.some(el => el.animation && el.animation.entrance !== 'none');
      if (!hasAnyAnim) continue;

      interface AnimEntry { spId: number; entrance: string; delay: number; duration: number }
      const animEntries: AnimEntry[] = [];
      exportedElements.forEach((el, i) => {
        const anim = el.animation;
        if (!anim || anim.entrance === 'none') return;
        const spId = shapeIdMap.get(el.id);
        if (!spId) return;
        animEntries.push({
          spId,
          entrance: anim.entrance,
          delay:    anim.delay    ?? i * 150,
          duration: anim.duration ?? 600,
        });
      });
      if (animEntries.length === 0) continue;

      let nodeId = 100;
      const getId = () => nodeId++;
      const rootId   = getId();
      const seqId    = getId();

      const parBlocks = animEntries.map((entry) => {
        const preset   = getPresetId(entry.entrance);
        const subtype  = getPresetSubtype(entry.entrance);
        const subtypeAttr = subtype ? \` presetSubtype="\${subtype}"\` : '';
        const dur      = Math.round(Math.max(100, entry.duration));
        const delayEmu = Math.round(entry.delay) * 100_000;
        const parId    = getId();
        const setId    = getId();
        const animId   = getId();
        return \`<p:par><p:cTn id="\${parId}" presetID="\${preset}"\${subtypeAttr} presetClass="entr" grpId="0" fill="hold" nodeType="clickEffect"><p:stCondLst><p:cond delay="\${delayEmu}"/></p:stCondLst><p:childTnLst><p:set><p:cBhvr><p:cTn id="\${setId}" dur="1" fill="hold"/><p:tgtEl><p:spTgt spid="\${entry.spId}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set><p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="\${animId}" dur="\${dur}"/><p:tgtEl><p:spTgt spid="\${entry.spId}"/></p:tgtEl></p:cBhvr></p:animEffect></p:childTnLst></p:cTn></p:par>\`;
      }).join('');

      const bldList = animEntries.map((entry, i) =>
        \`<p:bldP spid="\${entry.spId}" grpId="\${i}" uiExpand="0" build="p"/>\`
      ).join('');

      const timingXml =
        \`<p:timing><p:tnLst><p:par><p:cTn id="\${rootId}" dur="indefinite" restart="whenNotActive" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="\${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>\${parBlocks}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrevClick" delay="0"><p:tn/></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNextClick" delay="0"><p:tn/></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>\${bldList}</p:bldLst></p:timing>\`;

      if (xml.includes('<p:timing>')) {
        xml = xml.replace(/<p:timing>[\\s\\S]*?<\\/p:timing>/, timingXml);
      } else {
        xml = xml.replace('</p:sld>', \`\${timingXml}</p:sld>\`);
      }
      zip.file(\`ppt/slides/slide\${si + 1}.xml\`, xml);
    }
    return await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  } catch (e) {
    console.error('[PPTX] Animation injection failed:', e);
    return buffer;
  }
}

// ── Post-process: Make embedded MP4 videos autoplay on slide entry ────────────────
async function injectVideoAutoplay(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip   = await JSZip.loadAsync(buffer);

    const slideNames = Object.keys(zip.files)
      .filter(f => /^ppt\\/slides\\/slide\\d+\\.xml$/.test(f))
      .sort((a, b) => parseInt(a.match(/\\d+/)![0]) - parseInt(b.match(/\\d+/)![0]));

    for (const slideFileName of slideNames) {
      const slideFile = zip.file(slideFileName);
      if (!slideFile) continue;

      let xml = await slideFile.async('string');

      const videoShapeIds: number[] = [];
      const picRe = /<p:pic>[\\s\\S]*?<\\/p:pic>/g;
      let picM;
      while ((picM = picRe.exec(xml)) !== null) {
        if (picM[0].includes('<a:videoFile')) {
          const idM = /id="(\\d+)"/.exec(picM[0]);
          if (idM) videoShapeIds.push(parseInt(idM[1], 10));
        }
      }
      if (videoShapeIds.length === 0) continue;

      let maxId = 0;
      for (const m of xml.matchAll(/ id="(\\d+)"/g)) {
        const n = parseInt(m[1], 10);
        if (n > maxId) maxId = n;
      }
      let nid = Math.max(maxId + 50, 500);
      const nxt = () => nid++;

      const buildVideoPar = (spId: number) => {
        const [a, b, c, d] = [nxt(), nxt(), nxt(), nxt()];
        return (
          \`<p:par><p:cTn id="\${a}" fill="hold">\` +
            \`<p:stCondLst><p:cond delay="0"/></p:stCondLst>\` +
            \`<p:childTnLst>\` +
              \`<p:par><p:cTn id="\${b}" fill="hold">\` +
                \`<p:stCondLst><p:cond delay="0"/></p:stCondLst>\` +
                \`<p:childTnLst>\` +
                  \`<p:par><p:cTn id="\${c}" dur="indefinite" fill="hold">\` +
                    \`<p:stCondLst><p:cond delay="0"/></p:stCondLst>\` +
                    \`<p:childTnLst>\` +
                      \`<p:video><p:cMediaNode vol="80000">\` +
                        \`<p:cTn id="\${d}" dur="indefinite" fill="hold"/>\` +
                        \`<p:tgtEl><p:spTgt spid="\${spId}"/></p:tgtEl>\` +
                      \`</p:cMediaNode></p:video>\` +
                    \`</p:childTnLst>\` +
                  \`</p:cTn></p:par>\` +
                \`</p:childTnLst>\` +
              \`</p:cTn></p:par>\` +
            \`</p:childTnLst>\` +
          \`</p:cTn></p:par>\`
        );
      };

      const videoPars = videoShapeIds.map(buildVideoPar).join('');
      let injected = false;
      if (xml.includes('nodeType="mainSeq"')) {
        xml = xml.replace(/(nodeType="mainSeq"[^>]*><p:childTnLst>)/, \`$1\${videoPars}\`);
        injected = true;
      }

      if (!injected) {
        let seqId = nxt();
        let bldEntries = videoShapeIds.map((spId, i) => \`<p:bldP spid="\${spId}" grpId="\${i}" uiExpand="0" build="p"/>\`).join('');
        let timingXml = 
          \`<p:timing><p:tnLst><p:par><p:cTn id="\${nxt()}" dur="indefinite" restart="whenNotActive" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="\${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>\${videoPars}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onStopAudio" delay="0"><p:tn><p:cTnRef id="\${seqId}"/></p:tn></p:cond></p:prevCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>\${bldEntries}</p:bldLst></p:timing>\`;
        xml = xml.replace('</p:sld>', timingXml + '</p:sld>');
      }
      zip.file(slideFileName, xml);
    }
    return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  } catch (err) {
    console.error('[pptx-export] injectVideoAutoplay failed', err);
    return buffer;
  }
}

function getPresetId(entrance: string): number {
  const map: Record<string, number> = {
    none: 10, fadeSlideUp: 2, fadeSlideLeft: 2, slideRight: 2,
    fadeIn: 10, zoomIn: 18, elasticScale: 18, reveal: 37,
    blurIn: 10, glassBlur: 10, glitch: 2, flipIn: 8,
    bounceIn: 38, parallaxDrift: 2, verticalRise: 2, horizontalReveal: 2,
    depthRise: 18, floatGentle: 10, scaleSoft: 18, morphBlend: 10,
    cinematicImageZoom: 18, typewriterWords: 10, staggerLines: 2,
  };
  return map[entrance] || 10;
}

function getPresetSubtype(entrance: string): number | undefined {
  const map: Record<string, number> = {
    fadeSlideUp: 8, verticalRise: 8, staggerLines: 8,
    fadeSlideLeft: 2, parallaxDrift: 2, horizontalReveal: 2, glitch: 2,
    slideRight: 4, zoomIn: 1, elasticScale: 1, depthRise: 1,
    scaleSoft: 1, cinematicImageZoom: 1,
  };
  return map[entrance];
}
`;
  
  c += '\n' + injectors;
  fs.writeFileSync(file, c);
  console.log('Success completely rewriting run-pptx-export.ts with all features!');
}
run();
