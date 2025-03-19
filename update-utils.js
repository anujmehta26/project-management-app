const fs = require('fs');
const path = require('path');

// Directory to search for files
const directoryPath = path.join(__dirname, 'src/components');

// Function to recursively get all files in a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Skip the ui directory itself
      if (path.basename(filePath) !== 'ui') {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      // Only include JavaScript and JSX files
      if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

// Get all JS and JSX files
const allFiles = getAllFiles(directoryPath);

// Process each file
allFiles.forEach(filePath => {
  console.log(`Processing ${filePath}`);
  
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace import statements for cn utility
  const cnImportRegex = /import\s+{\s*cn\s*(?:,\s*[^}]+)?\s*}\s+from\s+['"]\.\.\/lib\/utils['"]/g;
  
  // Replace with imports from '@/lib/utils'
  content = content.replace(cnImportRegex, (match) => {
    // If the match includes other imports besides cn, preserve them
    const otherImportsMatch = match.match(/import\s+{\s*cn\s*,\s*([^}]+)?\s*}\s+from\s+['"]\.\.\/lib\/utils['"]/);
    
    if (otherImportsMatch && otherImportsMatch[1]) {
      return `import { cn } from '@/lib/utils';\nimport { ${otherImportsMatch[1]} } from '../lib/utils'`;
    }
    
    return `import { cn } from '@/lib/utils'`;
  });
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`Updated ${filePath}`);
});

console.log('All files processed successfully!'); 