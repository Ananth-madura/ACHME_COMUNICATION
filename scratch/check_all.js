const fs = require('fs');
const content = fs.readFileSync('backend/routes/taskRoutes.js', 'utf8');

let parens = 0;
let braces = 0;
let brackets = 0;
let inStr = false;
let strChar = '';
let inTpl = false;
let lineNum = 1;
let charNum = 0;

const checkPoint = (i, reason) => {
  const line = content.substring(0, i + 1).split('\n').length;
  const col = i - content.substring(0, i + 1).lastIndexOf('\n');
  console.log(`[Line ${line}] parens=${parens}, braces=${braces}, brackets=${brackets} - ${reason}`);
};

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const p = content[i - 1];

  if (c === '\n') {
    lineNum++;
    charNum = 0;
  } else {
    charNum++;
  }

  if (inTpl) {
    if (c === '`') inTpl = false;
  } else if (inStr) {
    if (c === strChar && p !== '\\') inStr = false;
  } else {
    if (c === '"' || c === "'") {
      inStr = true;
      strChar = c;
    } else if (c === '`') inTpl = true;
  }

  if (!inStr && !inTpl) {
    if (c === '(') { parens++; checkPoint(i, `Open paren`); }
    if (c === ')') { parens--; checkPoint(i, `Close paren`); }
    if (c === '{') { braces++; checkPoint(i, `Open brace`); }
    if (c === '}') { braces--; checkPoint(i, `Close brace`); }
    if (c === '[') { brackets++; checkPoint(i, `Open bracket`); }
    if (c === ']') { brackets--; checkPoint(i, `Close bracket`); }
  }

  // Check if we're at a bad state
  if (parens < 0 || braces < 0 || brackets < 0) {
    console.log('NEGATIVE at char ' + i + ': parens=' + parens + ', braces=' + braces + ', brackets=' + brackets);
    const start = Math.max(0, i - 50);
    const end = Math.min(content.length, i + 50);
    console.log('Context: ' + JSON.stringify(content.slice(start, end)));
    break;
  }
}

console.log('Final state: parens=' + parens + ', braces=' + braces + ', brackets=' + brackets);
console.log('Total chars: ' + content.length);