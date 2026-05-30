const fs = require('fs');
let code = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8').replace(/\r\n/g, '\n');

// 1. Disable injectAnimations
const t_disable = `    let finalBuffer = buffer;
    if (pptSlidesInfo.length > 0) {
      finalBuffer = await injectAnimations(finalBuffer, pptSlidesInfo);
      finalBuffer = await injectVideoAutoplay(finalBuffer);
    }`;

const r_disable = `    // Temporarily disabled injectAnimations because it causes file corruption (shape ID mismatches & XML schema violations)
    let finalBuffer = buffer;
    if (pptSlidesInfo.length > 0) {
      finalBuffer = await injectVideoAutoplay(finalBuffer);
    }`;

// 2. Fix the fallback XML for injectVideoAutoplay
const t_fallback = `        let timingXml = \n          \`<p:timing><p:tnLst><p:par><p:cTn id="\${nxt()}" dur="indefinite" restart="whenNotActive" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="\${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>\${videoPars}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onStopAudio" delay="0"><p:tn><p:cTnRef id="\${seqId}"/></p:tn></p:cond></p:prevCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>\${bldEntries}</p:bldLst></p:timing>\`;`;

const r_fallback = `        let timingXml = \n          \`<p:timing><p:tnLst><p:par><p:cTn id="\${nxt()}" dur="indefinite" restart="whenNotActive" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="\${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>\${videoPars}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrevClick" delay="0"><p:tn><p:cTnRef id="\${seqId}"/></p:tn></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNextClick" delay="0"><p:tn><p:cTnRef id="\${seqId}"/></p:tn></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>\${bldEntries}</p:bldLst></p:timing>\`;`;

let missing = false;
if (!code.includes(t_disable)) { console.log('Disable block missing'); missing = true; }
if (!code.includes(t_fallback)) { console.log('Fallback block missing'); missing = true; }

if (!missing) {
    code = code.replace(t_disable, r_disable);
    code = code.replace(t_fallback, r_fallback);
    fs.writeFileSync('src/lib/export/run-pptx-export.ts', code);
    console.log('Fixed export pipeline successfully!');
} else {
    console.log('Aborting due to missing targets');
}
