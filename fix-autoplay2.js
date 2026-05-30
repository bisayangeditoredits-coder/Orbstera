const fs = require('fs');
let code = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8').replace(/\r\n/g, '\n');

const t1 = `      const buildVideoPar = (spId: number) => {
        const [a, b, c, d] = [nxt(), nxt(), nxt(), nxt()];
        return (
          \`<p:par><p:cTn id="\${a}" fill="hold" nodeType="withEffect">\` +
            \`<p:stCondLst><p:cond delay="0"/></p:stCondLst>\` +
            \`<p:childTnLst>\` +
              \`<p:par><p:cTn id="\${b}" fill="hold">\` +
                \`<p:stCondLst><p:cond delay="0"/></p:stCondLst>\` +
                \`<p:childTnLst>\` +
                  \`<p:par><p:cTn id="\${c}" dur="indefinite" fill="hold">\` +
                    \`<p:stCondLst><p:cond delay="0"/></p:stCondLst>\` +
                    \`<p:childTnLst>\` +
                      \`<p:video><p:cMediaNode vol="80000">\` +
                        \`<p:cTn id="\${d}" dur="indefinite" fill="hold" repeatCount="indefinite"/>\` +
                        \`<p:tgtEl><p:spTgt spid="\${spId}"/></p:tgtEl>\` +
                      \`</p:cMediaNode></p:video>\` +
                    \`</p:childTnLst>\` +
                  \`</p:cTn></p:par>\` +
                \`</p:childTnLst>\` +
              \`</p:cTn></p:par>\` +
            \`</p:childTnLst>\` +
          \`</p:cTn></p:par>\`
        );
      };`;

const r1 = `      const buildVideoPar = (spId: number) => {
        const [a, b, c, d] = [nxt(), nxt(), nxt(), nxt()];
        return (
          \`<p:par><p:cTn id="\${a}" fill="hold" nodeType="withEffect">\` +
            \`<p:stCondLst><p:cond delay="0"/></p:stCondLst>\` +
            \`<p:childTnLst>\` +
              \`<p:par><p:cTn id="\${b}" fill="hold">\` +
                \`<p:stCondLst><p:cond delay="0"/></p:stCondLst>\` +
                \`<p:childTnLst>\` +
                  \`<p:par><p:cTn id="\${c}" dur="indefinite" fill="hold">\` +
                    \`<p:stCondLst><p:cond delay="0"/></p:stCondLst>\` +
                    \`<p:childTnLst>\` +
                      \`<p:video><p:cMediaNode vol="80000">\` +
                        \`<p:cTn id="\${d}" dur="indefinite" fill="hold" display="0" repeatCount="indefinite"/>\` +
                        \`<p:tgtEl><p:spTgt spid="\${spId}"/></p:tgtEl>\` +
                      \`</p:cMediaNode></p:video>\` +
                    \`</p:childTnLst>\` +
                  \`</p:cTn></p:par>\` +
                \`</p:childTnLst>\` +
              \`</p:cTn></p:par>\` +
            \`</p:childTnLst>\` +
          \`</p:cTn></p:par>\`
        );
      };`;

const t2 = `      if (xml.includes('nodeType="mainSeq"')) {
        xml = xml.replace(/(nodeType="mainSeq"[^>]*><p:childTnLst>)/, \`$1\${videoPars}\`);
        let bldEntries = videoShapeIds.map((spId, i) => \`<p:bldP spid="\${spId}" grpId="\${100+i}" uiExpand="0" build="p"/>\`).join('');
        if (xml.includes('</p:bldLst>')) {
          xml = xml.replace('</p:bldLst>', \`\${bldEntries}</p:bldLst>\`);
        } else if (xml.includes('</p:tnLst>')) {
          xml = xml.replace('</p:tnLst>', \`</p:tnLst><p:bldLst>\${bldEntries}</p:bldLst>\`);
        }
        injected = true;
      }

      if (!injected) {
        let seqId = nxt();
        let bldEntries = videoShapeIds.map((spId, i) => \`<p:bldP spid="\${spId}" grpId="\${i}" uiExpand="0" build="p"/>\`).join('');
        let timingXml = 
          \`<p:timing><p:tnLst><p:par><p:cTn id="\${nxt()}" dur="indefinite" restart="whenNotActive" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="\${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>\${videoPars}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrevClick" delay="0"><p:tn><p:cTnRef id="\${seqId}"/></p:tn></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNextClick" delay="0"><p:tn><p:cTnRef id="\${seqId}"/></p:tn></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>\${bldEntries}</p:bldLst></p:timing>\`;`;

const r2 = `      if (xml.includes('nodeType="mainSeq"')) {
        xml = xml.replace(/(nodeType="mainSeq"[^>]*><p:childTnLst>)/, \`$1\${videoPars}\`);
        // We do NOT inject <p:bldP> for videos. Build paragraphs are for text animations.
        // PowerPoint silently rejects autoplay if media elements have bogus paragraph builds!
        injected = true;
      }

      if (!injected) {
        let seqId = nxt();
        let timingXml = 
          \`<p:timing><p:tnLst><p:par><p:cTn id="\${nxt()}" dur="indefinite" restart="whenNotActive" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="\${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>\${videoPars}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrevClick" delay="0"><p:tn><p:cTnRef id="\${seqId}"/></p:tn></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNextClick" delay="0"><p:tn><p:cTnRef id="\${seqId}"/></p:tn></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>\`;`;

let missing = false;
if (!code.includes(t1)) { console.log('t1 missing'); missing = true; }
if (!code.includes(t2)) { console.log('t2 missing'); missing = true; }

if (!missing) {
  code = code.replace(t1, r1);
  code = code.replace(t2, r2);
  fs.writeFileSync('src/lib/export/run-pptx-export.ts', code);
  console.log('Successfully fixed Video Autoplay build paragraphs!');
} else {
  console.log('Aborting due to missing blocks.');
}
