const fs = require('fs');

const content = fs.readFileSync('d:/pptmaker/src/store/usePresentationStore.ts', 'utf8');

// Find setPresentation
const setPresentationStart = content.indexOf('  setPresentation: (data) => {');
if (setPresentationStart === -1) throw new Error('Could not find setPresentation');

let braceCount = 0;
let i = setPresentationStart + '  setPresentation: (data) => {'.length - 1;
for (; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  else if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) break;
  }
}
const setPresentationEnd = i + 1; // includes the closing }
const setPresentationBody = content.substring(setPresentationStart, setPresentationEnd);

const actionContent = `import { PresentationStore } from '../usePresentationStore';\nimport { PresentationData, Slide, SlideElement } from '@/types';\nimport { finalizeSlideMotion } from '@/lib/presentationMotion';\n\nconst CANVAS_W = 1280;\nconst CANVAS_H = 720;\n\nexport const setPresentationAction = (set: any, get: any, data: any) => ${setPresentationBody.replace('  setPresentation: (data) => ', '').trim()}`;

if (!fs.existsSync('d:/pptmaker/src/store/actions')) {
  fs.mkdirSync('d:/pptmaker/src/store/actions');
}
fs.writeFileSync('d:/pptmaker/src/store/actions/setPresentationAction.ts', actionContent, 'utf8');

// Rewrite store
const newStoreContent = content.replace(setPresentationBody, `  setPresentation: (data) => setPresentationAction(set, get, data)`);
const finalStoreContent = `import { setPresentationAction } from './actions/setPresentationAction';\n` + newStoreContent;
fs.writeFileSync('d:/pptmaker/src/store/usePresentationStore.ts', finalStoreContent, 'utf8');

console.log('Extracted setPresentationAction');
