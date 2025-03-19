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
  
  // Replace import statements
  // Match imports from './ui/...'
  const importRegex = /import\s+{([^}]+)}\s+from\s+['"]\.\/ui\/([^'"]+)['"]/g;
  
  // Replace with imports from '@/components/ui/...'
  content = content.replace(importRegex, (match, importedItems, componentName) => {
    return `import { ${importedItems} } from '@/components/ui/${componentName}'`;
  });
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`Updated ${filePath}`);
});

console.log('All files processed successfully!'); 