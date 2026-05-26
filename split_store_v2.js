const fs = require('fs');

const content = fs.readFileSync('d:/pptmaker/src/store/usePresentationStore.ts', 'utf8');

// EXTRACT TYPES
const interfaceStart = content.indexOf('interface PresentationStore {');
const interfaceEnd = content.indexOf('\n}\n', interfaceStart) + 2;
const interfaceContent = content.substring(interfaceStart, interfaceEnd);

const typesFile = `import { PresentationData, Slide, SlideElement, HistoryEntry, EditorState } from '@/types';\n\nexport ${interfaceContent}\n`;
fs.writeFileSync('d:/pptmaker/src/store/types.ts', typesFile, 'utf8');
console.log('Wrote types.ts');

// EXTRACT SLICES
const slideKeys = ['presentation', 'setPresentation', 'updatePresentation', 'currentSlideIndex', 'setCurrentSlideIndex', 'addSlide', 'removeSlide', 'updateSlide', 'duplicateSlide', 'reorderSlides', 'addElement', 'updateElement', 'removeElement', 'reorderElements', 'setElementsOrder'];
const selectionKeys = ['copyElement', 'pasteElement', 'duplicateElement', 'selectElement', 'selectElements', 'clearMultiSelection'];
const historyKeys = ['history', 'historyIndex', 'pushHistory', 'undo', 'redo'];
const uiKeys = ['editor', 'setEditorState', 'activePanel', 'setActivePanel', 'isPanelOpen', 'setPanelOpen', 'initGenerationPlaceholders', 'markGenerationPlaceholdersComposing', 'trackDeckGenerationImage', 'streamSlide', 'onboarding', 'startOnboarding', 'nextOnboardingStep', 'skipOnboarding'];

function extractKeyBlock(text, key) {
  const regex = new RegExp(`^  ${key}:`, 'm');
  const match = regex.exec(text);
  if (!match) return null;
  const startIndex = match.index;

  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  
  let i = startIndex + `  ${key}:`.length;
  while (i < text.length && text[i].match(/\s/)) i++;

  let blockEnd = i;
  for (; i < text.length; i++) {
    const char = text[i];
    
    if (inString) {
      if (char === stringChar && text[i-1] !== '\\') {
        inString = false;
      }
    } else {
      if (char === "'" || char === '"' || char === '`') {
        inString = true;
        stringChar = char;
      } else if (char === '{' || char === '[' || char === '(') {
        braceCount++;
      } else if (char === '}' || char === ']' || char === ')') {
        braceCount--;
      } else if (char === ',' && braceCount === 0) {
        blockEnd = i;
        break;
      }
    }
  }

  return text.substring(startIndex, blockEnd + 1).trim();
}

const storeStart = content.indexOf('export const usePresentationStore = create<PresentationStore>((set, get) => ({');
const storeBody = content.substring(storeStart);

function createSliceFile(name, keys, importsStr) {
  let sliceBody = `import { StateCreator } from 'zustand';\nimport { PresentationStore } from '../types';\n${importsStr}\n\nexport const ${name}: StateCreator<PresentationStore> = (set, get) => ({\n`;
  for (const key of keys) {
    const block = extractKeyBlock(storeBody, key);
    if (block) {
      sliceBody += `  ${block}\n\n`;
    } else {
      console.error('Failed to find block for', key);
    }
  }
  sliceBody += `});\n`;
  fs.writeFileSync(`d:/pptmaker/src/store/slices/${name}.ts`, sliceBody, 'utf8');
  console.log(`Created ${name}.ts`);
}

const slideImports = `import { PresentationData, Slide, SlideElement } from '@/types';\nimport { finalizeSlideMotion } from '@/lib/presentationMotion';\n\nconst CANVAS_W = 1280;\nconst CANVAS_H = 720;`;
const historyImports = `import { PresentationData, Slide, HistoryEntry } from '@/types';\n\nconst MAX_HISTORY_STEPS = 10;\n\nfunction slidesHistorySignature(slides: Slide[]): string {\n  return slides.map((s) => {\n    const els = s.elements || [];\n    return \`\${s.id}:\${els.length}:\${els.map((e) => \`\${e.id}:\${e.x}:\${e.y}:\${e.width}:\${e.height}\`).join(';')}\`;\n  }).join('|');\n}\n\nfunction historyEntrySignature(entry: HistoryEntry): string {\n  return \`\${entry.theme}:\${slidesHistorySignature(entry.slides)}\`;\n}\n\nfunction captureHistorySnapshot(presentation: PresentationData): HistoryEntry {\n  return {\n    slides: structuredClone(presentation.slides),\n    theme: presentation.theme || 'dark',\n    timestamp: Date.now(),\n  };\n}`;

createSliceFile('createSlideSlice', slideKeys, slideImports);
createSliceFile('createSelectionSlice', selectionKeys, `import { SlideElement } from '@/types';`);
createSliceFile('createHistorySlice', historyKeys, historyImports);
createSliceFile('createUISlice', uiKeys, `import { Slide } from '@/types';`);

// Write updated usePresentationStore.ts
const updatedStore = `import { create } from 'zustand';
import { PresentationStore } from './types';
import { createSlideSlice } from './slices/createSlideSlice';
import { createSelectionSlice } from './slices/createSelectionSlice';
import { createHistorySlice } from './slices/createHistorySlice';
import { createUISlice } from './slices/createUISlice';

export const usePresentationStore = create<PresentationStore>()((...a) => ({
  ...createSlideSlice(...a),
  ...createSelectionSlice(...a),
  ...createHistorySlice(...a),
  ...createUISlice(...a),
}));
`;
fs.writeFileSync('d:/pptmaker/src/store/usePresentationStore.ts', updatedStore, 'utf8');
console.log('Updated usePresentationStore.ts');
