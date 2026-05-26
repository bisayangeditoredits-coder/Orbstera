const fs = require('fs');

function fixTopBar() {
  const path = 'd:/pptmaker/src/components/editor/TopBar.tsx';
  let c = fs.readFileSync(path, 'utf8');
  
  // Replace the full store selection with granular selectors
  const badStoreSelect = `  const store       = usePresentationStore();
  const presentation = store.presentation;
  const { activePanel, setActivePanel, isPanelOpen, setPanelOpen, setEditorState, setPresentation, updatePresentation } = store;
  const cloudSync = store.editor.cloudSyncStatus;
  const cloudMsg  = store.editor.cloudSyncMessage;`;
  
  const goodStoreSelect = `  const presentation = usePresentationStore(s => s.presentation);
  const activePanel = usePresentationStore(s => s.activePanel);
  const isPanelOpen = usePresentationStore(s => s.isPanelOpen);
  const setActivePanel = usePresentationStore(s => s.setActivePanel);
  const setPanelOpen = usePresentationStore(s => s.setPanelOpen);
  const setEditorState = usePresentationStore(s => s.setEditorState);
  const setPresentation = usePresentationStore(s => s.setPresentation);
  const updatePresentation = usePresentationStore(s => s.updatePresentation);
  const cloudSync = usePresentationStore(s => s.editor.cloudSyncStatus);
  const cloudMsg = usePresentationStore(s => s.editor.cloudSyncMessage);`;

  c = c.replace(badStoreSelect, goodStoreSelect);
  
  // Also fix EditableTitle
  c = c.replace(
    /const \{ presentation, updatePresentation, setEditorState \} = usePresentationStore\(\);/,
    `const presentation = usePresentationStore(s => s.presentation);\n  const updatePresentation = usePresentationStore(s => s.updatePresentation);\n  const setEditorState = usePresentationStore(s => s.setEditorState);`
  );
  
  fs.writeFileSync(path, c, 'utf8');
}

fixTopBar();
console.log('Fixed TopBar store selectors');
