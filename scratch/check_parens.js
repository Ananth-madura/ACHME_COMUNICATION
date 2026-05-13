const fs = require('fs');
const content = fs.readFileSync('backend/routes/taskRoutes.js', 'utf8');

let parens = 0;
let inStr = false;
let strChar = '';
let inTpl = false;
let lineNum = 1;
let prevLineParens = [];

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const p = content[i - 1];

  if (c === '\n') {
    prevLineParens.push({line: lineNum, count: parens});
    lineNum++;
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
    if (c === '(') parens++;
    if (c === ')') parens--;
  }
}

console.log('Final parens: ' + parens);

// Show lines where count changes
for (let i = 1; i < prevLineParens.length; i++) {
  if (prevLineParens[i].count !== prevLineParens[i-1].count) {
    console.log('Line ' + prevLineParens[i].line + ': parens = ' + prevLineParens[i].count);
  }
}

// Find where parens first becomes > 0 after being 0
let found = false;
for (let i = 0; i < prevLineParens.length; i++) {
  if (prevLineParens[i].count > 0 && !found) {
    console.log('First imbalance starts at line ' + prevLineParens[i].line);
    found = true;
  }
  if (prevLineParens[i].count === 0 && found) {
    console.log('Balanced again at line ' + prevLineParens[i].line);
    found = false;
  }
}