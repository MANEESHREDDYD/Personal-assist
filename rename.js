/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!file.match(/^(node_modules|\.git|\.next|public)$/)) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (file.match(/\.(ts|tsx|md|json)$/) && file !== 'package-lock.json') {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync(path.join(__dirname, 'src')).concat(
  walkSync(path.join(__dirname, 'scripts'))
).concat([
  path.join(__dirname, 'README.md'),
  path.join(__dirname, 'package.json'),
  path.join(__dirname, 'walkthrough.md') // if exists
]);

let changedFiles = 0;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  content = content.replace(/LifeCommand AI/g, 'Personal Assist');
  content = content.replace(/LifeCommand/g, 'Personal Assist');
  content = content.replace(/"name": "lifecommand"/g, '"name": "personal-assist"');
  content = content.replace(/lifecommand-export/g, 'personal-assist-export');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Updated: ${file}`);
  }
});

console.log(`Renamed in ${changedFiles} files.`);
