const fs = require('fs');

function run() {
  const file = 'src/lib/export/run-pptx-export.ts';
  let c = fs.readFileSync(file, 'utf8');

  // Add video import
  c = c.replace(
    /import \{ fetchImageAsBase64ForExport \} from '@\/lib\/export\/export-image';/,
    `import { fetchImageAsBase64ForExport, fetchVideoAsBase64ForExport } from '@/lib/export/export-image';`
  );

  // Add exportedElements setup
  c = c.replace(
    /const sorted = \[\.\.\.\(slide\.elements \|\| \[\]\)\].sort\(\r?\n\s+\(a, b\) => \(a\.zIndex \|\| 0\) - \(b\.zIndex \|\| 0\),\r?\n\s+\);/,
    `const sorted = [...(slide.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));\n      const exportedElements: SlideElement[] = [];`
  );

  // TEXT
  c = c.replace(
    /autoFit:\s+false,\r?\n\s+\}\);/,
    `autoFit:            false,\n          });\n          exportedElements.push(el);`
  );

  // IMAGE / ICON -> add Video
  c = c.replace(
    /\/\/ ── IMAGE \/ ICON ──────────────────────────────────────────────────\r?\n\s+else if \(\r?\n\s+\(el\.type === 'image' \|\| el\.type === 'icon'\) &&\r?\n\s+el\.src &&\r?\n\s+!el\.aiImagePending\r?\n\s+\) \{\r?\n\s+const imgData =\r?\n\s+imgMap\.get\(`\$\{si\}:\$\{el\.id\}`\) \|\| \(await fetchImageAsBase64ForExport\(el\.src\)\);/,
    `// ── IMAGE / ICON / VIDEO ──────────────────────────────────────────────────
        else if (
          (el.type === 'image' || el.type === 'icon') &&
          el.src &&
          !el.aiImagePending
        ) {
          // ── YouTube embed ──────────────────────────────────────────────
          if (el.src.includes('youtube.com/embed/') || el.src.includes('youtu.be/')) {
            pptSlide.addMedia({
              type: 'online',
              link: el.src,
              ...common,
            });
            exportedElements.push(el);
            continue;
          }

          // ── MP4 / video file ──────────────────────────────────────────
          // BUG-13 fix: strip both query string AND hash fragment before checking extension
          const srcLower = el.src.split('?')[0].split('#')[0].toLowerCase();
          if (srcLower.endsWith('.mp4') || srcLower.endsWith('.mov') || srcLower.endsWith('.webm')) {
            console.log('[pptx-export] embedding video', el.id, el.src.slice(0, 80));
            const videoData = await fetchVideoAsBase64ForExport(el.src);
            if (videoData) {
              pptSlide.addMedia({
                type: 'video',
                data: videoData,
                ...common,
              } as any);
              exportedElements.push(el);
            } else {
              console.warn('[pptx-export] video fetch failed, skipping', el.id, el.src.slice(0, 80));
            }
            continue;
          }

          // ── Regular image ─────────────────────────────────────────────
          const imgData =
            imgMap.get(\`\${si}:\${el.id}\`) || (await fetchImageAsBase64ForExport(el.src));`
  );

  // IMAGE / ICON Push
  c = c.replace(
    /\? \{ transparency: imageTransparency \}\r?\n\s+: \{\}\),\r?\n\s+\} as any\);/,
    `? { transparency: imageTransparency }\n                : {}),\n            } as any);\n            exportedElements.push(el);`
  );

  // DRAW
  c = c.replace(
    /points: pts,\r?\n\s+\} as any\);/,
    `points: pts,\n          } as any);\n          exportedElements.push(el);`
  );

  // SHAPE PATH
  c = c.replace(
    /sizing: \{ type: 'contain', w: common\.w, h: common\.h \},\r?\n\s+\}\);/,
    `sizing: { type: 'contain', w: common.w, h: common.h },\n              });\n              exportedElements.push(el);`
  );

  // SHAPE ARROW
  c = c.replace(
    /fill: fillParsed \? \{ type: 'solid', color: fillParsed\.color \} : undefined,\r?\n\s+\} as any,\r?\n\s+\);/,
    `fill: fillParsed ? { type: 'solid', color: fillParsed.color } : undefined,\n              } as any,\n            );\n            exportedElements.push(el);`
  );

  // SHAPE OTHER
  c = c.replace(
    /el\.shapeType === 'rect' && ss\.cornerRadius \? ss\.cornerRadius \/ 100 : undefined,\r?\n\s+\} as any\);/,
    `el.shapeType === 'rect' && ss.cornerRadius ? ss.cornerRadius / 100 : undefined,\n          } as any);\n          exportedElements.push(el);`
  );

  // Metadata
  c = c.replace(
    /if \(notes\) pptSlide\.addNotes\(notes\);/,
    `if (notes) pptSlide.addNotes(notes);\n\n      // Save metadata for injectAnimations\n      (pptSlide as any)._orbsteraMeta = { bgShapeCount, exportedElements };`
  );

  // Final Output Call
  c = c.replace(
    /const buffer = await pptx\.write\(\{ outputType: 'arraybuffer' \}\) as ArrayBuffer;/,
    `const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;\n\n    // ── Inject entrance animations then video autoplay via OOXML post-processing ──\n    const pptSlidesInfo = ((pptx as any).slides || []).map((s: any) =>\n      s._orbsteraMeta || { bgShapeCount: 0, exportedElements: [] }\n    );\n    const animatedBuffer = await injectAnimations(buffer, pptSlidesInfo);\n    const finalBuffer    = await injectVideoAutoplay(animatedBuffer);`
  );
  c = c.replace(
    /Body: Buffer\.from\(buffer\),/,
    `Body: Buffer.from(finalBuffer),`
  );
  c = c.replace(
    /return \{ mode: 'download', buffer, fileName: `\$\{safeTitle\}\.pptx` \};/,
    `return { mode: 'download', buffer: finalBuffer, fileName: \`\${safeTitle}.pptx\` };`
  );

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
`;

  fs.writeFileSync(file, c + '\n' + injectors);
  console.log('Done!');
}
run();
