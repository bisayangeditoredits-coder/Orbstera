const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log("Searching past 50 commits for the Voice Protocol...");
  const commits = execSync('git log --format="%H" -n 50 --all').toString().split('\n').filter(Boolean);
  
  let targetHash = null;

  for (const hash of commits) {
    try {
      const content = execSync(`git show ${hash}:src/components/landing/HeroSection.tsx`).toString();
      if (content.includes("activeMode === 'voice'") || content.includes('Voice Protocol')) {
        targetHash = hash;
        break;
      }
    } catch(e) {}
  }

  if (targetHash) {
    console.log(`FOUND IT! Commit hash: ${targetHash}`);
    console.log("Extracting and patching the exact files to fix the Microphone Race Condition...");

    // Extract and Patch HeroSection
    let heroContent = execSync(`git show ${targetHash}:src/components/landing/HeroSection.tsx`).toString();
    heroContent = heroContent.replace(
      /await startAudioAnalysis\(\);\s*shouldBeListeningRef\.current = true;\s*rec\.start\(\);\s*setIsListening\(true\);/g,
      `shouldBeListeningRef.current = true;
        rec.start();
        setIsListening(true);
        setTimeout(() => {
          if (shouldBeListeningRef.current) {
            startAudioAnalysis().catch(err => console.warn("Audio analysis skipped due to lock:", err));
          }
        }, 800);`
    );
    heroContent = heroContent.replace(
      /setSpeechError\('Microphone access blocked\. Enable it in browser settings\.'\);/g,
      `setSpeechError('Microphone access blocked or in use by another app.');`
    );
    fs.writeFileSync('src/components/landing/HeroSection.tsx', heroContent);

    // Extract GeneratePanel
    try {
      let genPanelContent = execSync(`git show ${targetHash}:src/components/editor/GeneratePanel.tsx`).toString();
      genPanelContent = genPanelContent.replace(
        /await startAudioAnalysis\(\);\s*shouldBeListeningRef\.current = true;\s*rec\.start\(\);\s*setIsListening\(true\);/g,
        `shouldBeListeningRef.current = true;
        rec.start();
        setIsListening(true);
        setTimeout(() => {
          if (shouldBeListeningRef.current) {
            startAudioAnalysis().catch(err => console.warn("Audio analysis skipped:", err));
          }
        }, 800);`
      );
      fs.writeFileSync('src/components/editor/GeneratePanel.tsx', genPanelContent);
    } catch(e) { console.log("Warning: GeneratePanel.tsx not found in that commit."); }

    // Extract MagicEditToolbar
    try {
      const magicContent = execSync(`git show ${targetHash}:src/components/editor/MagicEditToolbar.tsx`).toString();
      fs.writeFileSync('src/components/editor/MagicEditToolbar.tsx', magicContent);
    } catch(e) { console.log("Warning: MagicEditToolbar.tsx not found in that commit."); }

    console.log("Files have been restored. Now committing and pushing...");
    
    // Stage, Commit and Push
    execSync('git add src/components/landing/HeroSection.tsx src/components/editor/GeneratePanel.tsx src/components/editor/MagicEditToolbar.tsx');
    execSync('git commit -m "fix: emergency restore voice protocol and fix mic lock issue"');
    
    const branch = execSync('git branch --show-current').toString().trim();
    execSync(`git push origin ${branch}`);
    
    execSync('git checkout main');
    execSync(`git merge ${branch}`);
    execSync('git push origin main');
    execSync(`git checkout ${branch}`);
    
    console.log("==========================================");
    console.log("RESTORE & FIX SUCCESSFUL! Vercel is now deploying.");
    console.log("==========================================");
  } else {
    console.log("Error: Could not find any commit with the Voice Protocol in the last 50 commits.");
  }
} catch (error) {
  console.error("An error occurred:", error.message);
}
