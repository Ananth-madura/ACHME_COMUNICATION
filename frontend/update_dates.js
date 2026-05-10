const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

const dateFields = [
  "walkin_date", "followup_date", "reminder_date",
  "call_date", "created_date", "due_date",
  "quotation_date", "invoice_date", "performaInvoice_date", "visit_date",
  "payment_date", "invoice_duedate", "Estimate_date", "Expiry_date",
  "start_date", "end_date", "date"
];

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const field of dateFields) {
    // replace `field: "",` with `field: new Date().toISOString().slice(0, 10),`
    const regex = new RegExp(`(${field}\\s*:\\s*)(['"]['"])`, "g");
    content = content.replace(regex, `$1new Date().toISOString().slice(0, 10)`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
