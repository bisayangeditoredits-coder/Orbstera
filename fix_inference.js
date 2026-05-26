const fs = require('fs');

function fixSliceInference(name) {
  const path = `d:/pptmaker/src/store/slices/${name}.ts`;
  let content = fs.readFileSync(path, 'utf8');
  
  // Replace the signature
  content = content.replace(
    /export const ([a-zA-Z]+): StateCreator<PresentationStore> = \(set, get\) => \(\{/g,
    `export const $1: StateCreator<PresentationStore, [], [], any> = (set, get) => ({`
  );
  // Remove the previous 'as any'
  content = content.replace(/\s+as any\);\n$/g, '\n});\n');
  
  fs.writeFileSync(path, content, 'utf8');
}

fixSliceInference('createSlideSlice');
fixSliceInference('createSelectionSlice');
fixSliceInference('createHistorySlice');
fixSliceInference('createUISlice');

console.log('Fixed slice inference');
