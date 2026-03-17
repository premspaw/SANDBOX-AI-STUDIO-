const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

const snippet = `            const contentParts = [...gcsContentParts, ...httpContentParts];
            contentParts.push({ text: biblePrefix + prompt.replace(/--ar\\s+\\d+:\\d+/g, '').trim() });

            console.log(\`[BACKEND] contentParts total: \${contentParts.length}\`);
            contentParts.forEach((p, idx) => {
                const type = p.inlineData ? 'inlineData' : p.fileData ? 'fileData' : 'text';
                console.log(\`  - Part [\${idx}]: type=\${type}\`);
            });

            const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
            const apiUrl =`;

const target = `const apiUrl =`;
if (c.includes('apiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;')) {
    // Only replace the FIRST occurrence in that image branch
    c = c.replace(target, snippet);
    fs.writeFileSync('server.js', c, 'utf8');
    console.log('Fixed server.js');
} else {
    console.log('Target string not found');
}
