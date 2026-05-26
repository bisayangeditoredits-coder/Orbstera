const fs = require('fs');

function fixGeneratePanel() {
  const path = 'd:/pptmaker/src/components/editor/GeneratePanel.tsx';
  let c = fs.readFileSync(path, 'utf8');
  
  c = c.replace(
    /const \{ presentation, setPresentation, setActivePanel, setEditorState, editor \} = usePresentationStore\(\);/,
    `const presentation = usePresentationStore(s => s.presentation);\n  const setPresentation = usePresentationStore(s => s.setPresentation);\n  const setActivePanel = usePresentationStore(s => s.setActivePanel);\n  const setEditorState = usePresentationStore(s => s.setEditorState);\n  const editor = usePresentationStore(s => s.editor);`
  );
  
  fs.writeFileSync(path, c, 'utf8');
}

function fixLayoutsPanel() {
  const path = 'd:/pptmaker/src/components/editor/LayoutsPanel.tsx';
  let c = fs.readFileSync(path, 'utf8');
  
  c = c.replace(
    /const \{ presentation, currentSlideIndex, updateSlide, selectElement \} = usePresentationStore\(\);/,
    `const presentation = usePresentationStore(s => s.presentation);\n  const currentSlideIndex = usePresentationStore(s => s.currentSlideIndex);\n  const updateSlide = usePresentationStore(s => s.updateSlide);\n  const selectElement = usePresentationStore(s => s.selectElement);`
  );
  
  fs.writeFileSync(path, c, 'utf8');
}

fixGeneratePanel();
fixLayoutsPanel();
console.log('Fixed GeneratePanel and LayoutsPanel store selectors');
