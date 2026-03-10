const fs = require('fs');
const content = fs.readFileSync('src/components/panels/PromptGenerator.jsx', 'utf8');
let b=0, p=0, inStr=null, line=1;
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
    if (c === '{') b++;
    if (c === '}') {
        b--;
        if (b < 0) console.log('EXTRA CLOSE BRACE at line ' + line);
    }
    if (c === '(') p++;
    if (c === ')') {
        p--;
        if (p < 0) console.log('EXTRA CLOSE PAREN at line ' + line);
    }
}
console.log('Final Balance: B=' + b + ', P=' + p);
