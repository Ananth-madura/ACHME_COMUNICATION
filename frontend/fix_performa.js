const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'performainvoice.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/performa Invoices/g, 'performaInvoices');
content = content.replace(/performa Invoice/g, 'performaInvoice');
content = content.replace(/Performa Invoice/g, 'PerformaInvoice');

// Now restore the display Strings
content = content.replace(/<h2>PerformaInvoice<\/h2>/g, '<h2>Performa Invoice</h2>');
content = content.replace(/filename: \`PerformaInvoice_\$\{viewId\}\.pdf\`/g, 'filename: `Performa_Invoice_${viewId}.pdf`');
content = content.replace(/"PerformaInvoice/g, '"Performa Invoice');
content = content.replace(/PerformaInvoice Number/g, 'Performa Invoice Number');
content = content.replace(/PerformaInvoice_date/g, 'invoice_date'); // also fix name attr
content = content.replace(/performaInvoice_date/g, 'invoice_date');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed syntax errors.');
