const fs = require('fs');
let code = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8').replace(/\r\n/g, '\n');

const t_anim = `      if (xml.includes('<p:timing>')) {
        xml = xml.replace(/<p:timing>[\\s\\S]*?<\\/p:timing>/, timingXml);
      } else {
        xml = xml.replace('</p:sld>', \`\${timingXml}</p:sld>\`);
      }`.replace(/\r\n/g, '\n');

const r_anim = `      if (xml.includes('<p:timing>')) {
        xml = xml.replace(/<p:timing>[\\s\\S]*?<\\/p:timing>/, timingXml);
      } else if (xml.includes('<p:extLst>')) {
        xml = xml.replace('<p:extLst>', \`\${timingXml}<p:extLst>\`);
      } else if (xml.includes('</p:transition>')) {
        xml = xml.replace('</p:transition>', \`</p:transition>\${timingXml}\`);
      } else {
        xml = xml.replace('</p:cSld>', \`</p:cSld>\${timingXml}\`);
      }`.replace(/\r\n/g, '\n');

const t_vid = `      if (xml.includes('nodeType="mainSeq"')) {
        xml = xml.replace(/(nodeType="mainSeq"[^>]*><p:childTnLst>)/, \`$1\${videoPars}\`);
        injected = true;
      }

      if (!injected) {
        let seqId = nxt();
        let bldEntries = videoShapeIds.map((spId, i) => \`<p:bldP spid="\${spId}" grpId="\${i}" uiExpand="0" build="p"/>\`).join('');
        let timingXml = 
          \`<p:timing><p:tnLst><p:par><p:cTn id="\${nxt()}" dur="indefinite" restart="whenNotActive" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="\${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>\${videoPars}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onStopAudio" delay="0"><p:tn><p:cTnRef id="\${seqId}"/></p:tn></p:cond></p:prevCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>\${bldEntries}</p:bldLst></p:timing>\`;
        xml = xml.replace('</p:sld>', timingXml + '</p:sld>');
      }`.replace(/\r\n/g, '\n');

const r_vid = `      if (xml.includes('nodeType="mainSeq"')) {
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
          \`<p:timing><p:tnLst><p:par><p:cTn id="\${nxt()}" dur="indefinite" restart="whenNotActive" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="\${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>\${videoPars}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onStopAudio" delay="0"><p:tn><p:cTnRef id="\${seqId}"/></p:tn></p:cond></p:prevCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>\${bldEntries}</p:bldLst></p:timing>\`;
        if (xml.includes('<p:extLst>')) {
          xml = xml.replace('<p:extLst>', \`\${timingXml}<p:extLst>\`);
        } else if (xml.includes('</p:transition>')) {
          xml = xml.replace('</p:transition>', \`</p:transition>\${timingXml}\`);
        } else {
          xml = xml.replace('</p:cSld>', \`</p:cSld>\${timingXml}\`);
        }
      }`.replace(/\r\n/g, '\n');

let missing = false;
if (!code.includes(t_anim)) { console.log('T_ANIM missing'); missing = true; }
if (!code.includes(t_vid)) { console.log('T_VID missing'); missing = true; }

if (!missing) {
    code = code.replace(t_anim, r_anim);
    code = code.replace(t_vid, r_vid);
    
    // For Video Looping: Modify the <p:cTn> inside buildVideoPar to include repeatCount="indefinite"
    const t_vid_par = \`<p:cTn id="\${d}" dur="indefinite" fill="hold"/>\`;
    const r_vid_par = \`<p:cTn id="\${d}" dur="indefinite" fill="hold" repeatCount="indefinite"/>\`;
    code = code.replace(t_vid_par, r_vid_par);

    fs.writeFileSync('src/lib/export/run-pptx-export.ts', code);
    console.log('Fixed timing XML position and looping!');
} else {
    console.log('Aborting due to missing targets');
}
