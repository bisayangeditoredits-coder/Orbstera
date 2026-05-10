const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log("Restoring files...");
  
  // Find a commit where HeroSection.tsx had 'voice' mode
  const log = execSync('git log -p -n 10 src/components/landing/HeroSection.tsx').toString();
  
  // We can just use git checkout to restore from the origin's previous state if needed,
  // but it's safer to just look at git reflog or simply undo the last 2 commits to the files.
  
  // Let's checkout the files from the commit before "chore: sync local changes before merge"
  // Actually, we can just run a git checkout command to an older point in time.
  // Or better, let's search through commits to find the one that has Voice Protocol.
  
  const commits = execSync('git log --format="%H" -n 10').toString().split('\n').filter(Boolean);
  
  let foundCommit = null;
  for (const hash of commits) {
    try {
      const content = execSync(`git show ${hash}:src/components/landing/HeroSection.tsx`).toString();
      if (content.includes("Voice Protocol") || content.includes("setActiveMode('voice')")) {
        foundCommit = hash;
        break;
      }
    } catch(e) {}
  }

  if (foundCommit) {
    console.log(`Found voice protocol in commit ${foundCommit}. Restoring...`);
    execSync(`git checkout ${foundCommit} -- src/components/landing/HeroSection.tsx src/components/editor/GeneratePanel.tsx src/components/editor/MagicEditToolbar.tsx`);
    console.log("Restored successfully! Now committing and pushing...");
    
    execSync('git add src/components/landing/HeroSection.tsx src/components/editor/GeneratePanel.tsx src/components/editor/MagicEditToolbar.tsx');
    execSync('git commit -m "fix: restore voice protocol"');
    
    // push to current branch
    const branch = execSync('git branch --show-current').toString().trim();
    execSync(`git push origin ${branch}`);
    
    // also push to main
    execSync('git checkout main');
    execSync(`git merge ${branch}`);
    execSync('git push origin main');
    execSync(`git checkout ${branch}`);
    
    console.log("SUCCESS! Voice protocol is back online.");
  } else {
    console.log("Could not find the previous state of the voice protocol in recent history.");
  }
} catch (error) {
  console.error(error.message);
}
