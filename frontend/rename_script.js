const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'performainvoice.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/Proposal/g, 'PerformaInvoice');
content = content.replace(/quotations/g, 'performaInvoices');
content = content.replace(/quotation/g, 'performaInvoice');
content = content.replace(/Quotation/g, 'Performa Invoice');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replacements completed.');
