const fs = require('fs');
const path = require('path');

function exportDocs() {
  const sourceDir = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\51670fd7-d470-4b1a-8b79-e5d173e6f0c5';
  const targetDir = path.join(__dirname, 'docs', 'progress');
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const files = ['task.md', 'walkthrough.md', 'implementation_plan.md'];

  for (const file of files) {
    const sourceFile = path.join(sourceDir, file);
    if (fs.existsSync(sourceFile)) {
      const targetFile = path.join(targetDir, `${file.replace('.md', '')}-${timestamp}.md`);
      fs.copyFileSync(sourceFile, targetFile);
      console.log(`Copied ${file} to ${targetFile}`);
    }
  }
}

exportDocs();
