const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.html')) {
            results.push(file);
        }
    });
    return results;
}

const htmlFiles = walk(__dirname);

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/PP\./g, 'PP');
    content = content.replace(/Pratik\./g, 'Pratik');
    
    if (file.endsWith('index.html')) {
        const oldLine = `<div class="terminal__line" id="terminal-input-line">\n            <span class="terminal__prompt">visitor@portfolio:~$</span> <span class="terminal__cursor-blink"></span>\n          </div>`;
        const newLine = `<div class="terminal__line" id="terminal-input-line"><span class="terminal__prompt">visitor@portfolio:~$</span> <span class="terminal__cursor-blink"></span></div>`;
        content = content.replace(oldLine, newLine);
    }
    
    fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed dots and whitespace.');
