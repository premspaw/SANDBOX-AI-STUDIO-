const fs = require('fs');
const content = fs.readFileSync('src/components/panels/PromptGenerator.jsx', 'utf8');
let bStack=[], pStack=[], inStr=null, line=1;
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
    if (c === '{') bStack.push(line);
    if (c === '}') bStack.pop();
    if (c === '(') pStack.push(line);
    if (c === ')') pStack.pop();
}
console.log('UNCLOSED BRACES OPENED AT LINES:', bStack);
console.log('UNCLOSED PARENS OPENED AT LINES:', pStack);
