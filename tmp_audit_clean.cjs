const fs = require('fs');
let content = fs.readFileSync('src/components/panels/PromptGenerator.jsx', 'utf8');

// Strip JSX comments {/* ... */}
content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
// Strip JS block comments /* ... */
content = content.replace(/\/\*[\s\S]*?\*\//g, '');
// Strip JS line comments // ...
content = content.replace(/\/\/.*/g, '');

let b=0, p=0, inStr=null, line=1;
let bStack = [], pStack = [];

for (let i=0; i<content.length; i++) {
    const c = content[i];
    if (c === '\n') line++;
    if (inStr) {
        if (c === inStr && content[i-1] !== '\\') inStr = null;
        continue;
    }
    if (c === "'" || c === '"' || c === '`') {
        inStr = c;
        continue;
    }
    if (c === '{') { b++; bStack.push(line); }
    if (c === '}') { b--; bStack.pop(); }
    if (c === '(') { p++; pStack.push(line); }
    if (c === ')') { p--; pStack.pop(); }
}
console.log('Final Balance: B=' + b + ', P=' + p);
console.log('UNCLOSED B:', bStack);
console.log('UNCLOSED P:', pStack);
