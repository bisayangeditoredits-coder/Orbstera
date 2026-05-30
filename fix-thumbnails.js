const fs = require('fs');

function fixSidebar() {
  let code = fs.readFileSync('src/components/editor/Sidebar.tsx', 'utf8').replace(/\r\n/g, '\n');
  const targetImageStyle = `objectFit: 'cover' as const,
              transform: el.rotation ? \`rotate(\${el.rotation}deg)\` : undefined,
            };`;
  const replaceImageStyle = `objectFit: 'cover' as const,
              maxWidth: 'none',
              transform: el.rotation ? \`rotate(\${el.rotation}deg)\` : undefined,
            };`;
            
  const targetBg = `style={{ opacity: 0.18, pointerEvents: 'none' }}`;
  const replaceBg = `style={{ opacity: 0.18, pointerEvents: 'none', maxWidth: 'none' }}`;

  code = code.replace(targetImageStyle, replaceImageStyle);
  code = code.replace(targetBg, replaceBg);
  
  fs.writeFileSync('src/components/editor/Sidebar.tsx', code);
  console.log('Fixed Sidebar.tsx');
}

function fixBottomSlideStrip() {
  let code = fs.readFileSync('src/components/editor/BottomSlideStrip.tsx', 'utf8').replace(/\r\n/g, '\n');
  const target = `objectFit: 'cover', opacity: el.opacity ?? 1 }}`;
  const replace = `objectFit: 'cover', maxWidth: 'none', opacity: el.opacity ?? 1 }}`;
  
  if (code.includes(target)) {
    code = code.replace(target, replace);
    fs.writeFileSync('src/components/editor/BottomSlideStrip.tsx', code);
    console.log('Fixed BottomSlideStrip.tsx');
  }
}

fixSidebar();
fixBottomSlideStrip();
