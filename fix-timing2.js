const fs = require('fs');
let code = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8').replace(/\r\n/g, '\n');

// Fix 1: injectAnimations
code = code.replace(
  "      if (xml.includes('<p:timing>')) {\n        xml = xml.replace(/<p:timing>[\\s\\S]*?<\\/p:timing>/, timingXml);\n      } else {\n        xml = xml.replace('</p:sld>', \\</p:sld>\);\n      }",
  "      if (xml.includes('<p:timing>')) {\n        xml = xml.replace(/<p:timing>[\\s\\S]*?<\\/p:timing>/, timingXml);\n      } else if (xml.includes('<p:extLst>')) {\n        xml = xml.replace('<p:extLst>', \\<p:extLst>\);\n      } else if (xml.includes('</p:transition>')) {\n        xml = xml.replace('</p:transition>', \</p:transition>\\);\n      } else {\n        xml = xml.replace('</p:cSld>', \</p:cSld>\\);\n      }"
);

// Fix 2: injectVideoAutoplay inner
code = code.replace(
  "      if (xml.includes('nodeType=\"mainSeq\"')) {\n        xml = xml.replace(/(nodeType=\"mainSeq\"[^>]*><p:childTnLst>)/, \$1\\);\n        injected = true;\n      }",
  "      if (xml.includes('nodeType=\"mainSeq\"')) {\n        xml = xml.replace(/(nodeType=\"mainSeq\"[^>]*><p:childTnLst>)/, \$1\\);\n        let bldEntries = videoShapeIds.map((spId, i) => \<p:bldP spid=\"\\" grpId=\"\\" uiExpand=\"0\" build=\"p\"/>\).join('');\n        if (xml.includes('</p:bldLst>')) {\n          xml = xml.replace('</p:bldLst>', \\</p:bldLst>\);\n        } else if (xml.includes('</p:tnLst>')) {\n          xml = xml.replace('</p:tnLst>', \</p:tnLst><p:bldLst>\</p:bldLst>\);\n        }\n        injected = true;\n      }"
);

// Fix 3: injectVideoAutoplay outer
code = code.replace(
  "        xml = xml.replace('</p:sld>', timingXml + '</p:sld>');",
  "        if (xml.includes('<p:extLst>')) {\n          xml = xml.replace('<p:extLst>', \\<p:extLst>\);\n        } else if (xml.includes('</p:transition>')) {\n          xml = xml.replace('</p:transition>', \</p:transition>\\);\n        } else {\n          xml = xml.replace('</p:cSld>', \</p:cSld>\\);\n        }"
);

// Fix 4: Loop video
code = code.replace(
  '<p:cTn id="" dur="indefinite" fill="hold"/>',
  '<p:cTn id="" dur="indefinite" fill="hold" repeatCount="indefinite"/>'
);

fs.writeFileSync('src/lib/export/run-pptx-export.ts', code);
console.log('Fixed timing XML position and looping using standard strings!');
