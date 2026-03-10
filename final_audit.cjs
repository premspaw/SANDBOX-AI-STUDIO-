const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'components', 'panels', 'PromptGenerator.jsx');
const content = fs.readFileSync(file, 'utf8');

let divDepth = 0;
let braceStack = [];
let parenStack = [];

const lines = content.split('\n');

lines.forEach((line, i) => {
    const row = i + 1;
    
    // Ignore comments
    const cleanLine = line.replace(/\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, '');
    
    // Check divs
    const opens = (cleanLine.match(/<div(?![^>]*\/>)/g) || []).length;
    const closes = (cleanLine.match(/<\/div>/g) || []).length;
    divDepth += opens - closes;
    
    if (opens !== closes) {
       // console.log(`Row ${row}: divDepth ${divDepth} (opens ${opens}, closes ${closes})`);
    }

    // Simple bracket check (ignores strings for now)
    for (const char of cleanLine) {
        if (char === '{') braceStack.push(row);
        if (char === '}') braceStack.pop();
        if (char === '(') parenStack.push(row);
        if (char === ')') parenStack.pop();
    }
});

console.log('Final Balance:');
console.log('Divs:', divDepth);
console.log('Braces:', braceStack.length);
console.log('Parens:', parenStack.length);
