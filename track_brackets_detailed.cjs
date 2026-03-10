const fs = require('fs');
const content = fs.readFileSync('src/components/panels/PromptGenerator.jsx', 'utf8');
let bStack=[], pStack=[], inStr=null, line=1;
let log = [];
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
    if (line >= 1550 && line <= 1850) {
        if (c === '{') { bStack.push(line); log.push(line + ': PUSH { (Depth ' + bStack.length + ')'); }
        if (c === '}') { const op = bStack.pop(); log.push(line + ': POP } matched ' + op + ' (Depth ' + bStack.length + ')'); }
        if (c === '(') { pStack.push(line); log.push(line + ': PUSH ( (Depth ' + pStack.length + ')'); }
        if (c === ')') { const op = pStack.pop(); log.push(line + ': POP ) matched ' + op + ' (Depth ' + pStack.length + ')'); }
    } else {
        if (c === '{') bStack.push(line);
        if (c === '}') bStack.pop();
        if (c === '(') pStack.push(line);
        if (c === ')') pStack.pop();
    }
}
fs.writeFileSync('detailed_brackets.txt', log.join('\n'));
console.log('STILL OPEN AT END:', bStack, pStack);
