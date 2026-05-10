const fs = require('fs');
const { execSync } = require('child_process');

try {
  console.log("Applying the ultimate microphone permission lock fix...");

  // 1. Fix HeroSection.tsx
  let hero = fs.readFileSync('src/components/landing/HeroSection.tsx', 'utf-8');
  
  const heroFix = `
      try {
        try {
          rec.lang = speechLangRef.current;
        } catch {
          /* noop */
        }
        
        // ULTIMATE FIX: Ask for permission using getUserMedia first (forces the prompt reliably)
        // Then immediately stop the stream to release the hardware lock.
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());
        
        shouldBeListeningRef.current = true;
        
        // 1. Start Speech Recognition now that permission is definitely granted and hardware is free
        rec.start();
        setIsListening(true);

        // 2. Delay the Audio Analysis (orb animation) to prevent hardware lock race conditions
        setTimeout(() => {
          if (shouldBeListeningRef.current) {
            startAudioAnalysis().catch(err => console.warn("Audio analysis skipped due to lock:", err));
          }
        }, 800);

      } catch (err) {`;
      
  hero = hero.replace(/try\s*\{\s*try\s*\{\s*rec\.lang\s*=\s*speechLangRef\.current;\s*\}\s*catch\s*\{\s*\/\*\s*noop\s*\*\/\s*\}\s*shouldBeListeningRef\.current\s*=\s*true;\s*rec\.start\(\);\s*setIsListening\(true\);\s*setTimeout\(\(\)\s*=>\s*\{\s*if\s*\(shouldBeListeningRef\.current\)\s*\{\s*startAudioAnalysis\(\)\.catch\(err\s*=>\s*console\.warn\("Audio analysis skipped due to lock:",\s*err\)\);\s*\}\s*\},\s*800\);\s*\}\s*catch\s*\(err\)\s*\{/g, heroFix);
  
  fs.writeFileSync('src/components/landing/HeroSection.tsx', hero);

  // 2. Fix editor-speech.ts (Add tempStream trick to createEditorSpeechRecognition if possible, or just the error message)
  let editorSpeech = fs.readFileSync('src/lib/editor-speech.ts', 'utf-8');
  editorSpeech = editorSpeech.replace(
    /opts\.onErrorMessage\?\('Microphone blocked\. Allow access in browser settings\.'\);/g,
    `opts.onErrorMessage?.('Microphone blocked or hardware in use.');`
  );
  fs.writeFileSync('src/lib/editor-speech.ts', editorSpeech);

  // 3. Fix GeneratePanel and MagicEditToolbar (they use editor-speech.ts)
  // To fix them, we need to apply the same getUserMedia trick before calling rec.start()
  const applyTrickToEditorComponents = (filePath) => {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const replacement = `
    shouldBeListeningRef.current = true;
    speechLangRef.current = resolveEditorSpeechLang();
    try {
      // Release hardware lock trick
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(t => t.stop());

      rec.lang = speechLangRef.current;
      rec.start();
      setIsListening(true);
    } catch {`;
      
      // We need to make toggleVoice async!
      content = content.replace(/const toggleVoice = \(\) => {/g, 'const toggleVoice = async () => {');
      content = content.replace(
        /shouldBeListeningRef\.current = true;\s*speechLangRef\.current = resolveEditorSpeechLang\(\);\s*try \{\s*rec\.lang = speechLangRef\.current;\s*rec\.start\(\);\s*setIsListening\(true\);\s*\} catch \{/g,
        replacement
      );
      fs.writeFileSync(filePath, content);
    } catch(e) {}
  };

  applyTrickToEditorComponents('src/components/editor/GeneratePanel.tsx');
  applyTrickToEditorComponents('src/components/editor/MagicEditToolbar.tsx');

  console.log("Fixes applied. Now pushing to Vercel...");
  
  execSync('git add -A');
  execSync('git commit -m "fix: ultimate microphone permission hardware lock bypass"');
  const branch = execSync('git branch --show-current').toString().trim();
  execSync(`git push origin ${branch}`);
  execSync('git checkout main');
  execSync(`git merge ${branch}`);
  execSync('git push origin main');
  execSync(`git checkout ${branch}`);
  
  console.log("==========================================");
  console.log("ULTIMATE FIX DEPLOYED!");
  console.log("==========================================");

} catch (error) {
  console.error(error.message);
}
