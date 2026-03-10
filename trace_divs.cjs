const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'components', 'panels', 'PromptGenerator.jsx');
const content = fs.readFileSync(file, 'utf8');

let divDepth = 0;
const lines = content.split('\n');

lines.forEach((line, i) => {
    const row = i + 1;
    const cleanLine = line.replace(/\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, '').replace(/`[^`]*`/g, '""').replace(/'[^']*'/g, '""').replace(/"[^"]*"/g, '""');
    
    const opens = (cleanLine.match(/<div(?![^>]*\/>)/g) || []).length;
    const closes = (cleanLine.match(/<\/div>/g) || []).length;
    
    if (opens !== closes) {
        divDepth += opens - closes;
        console.log(`Row ${row}: diff ${opens - closes}, cumulative depth ${divDepth} | Content: ${line.trim().slice(0, 50)}`);
    }
});

console.log('Final Balance:', divDepth);
