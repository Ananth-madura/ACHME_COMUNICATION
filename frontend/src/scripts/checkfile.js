const fs = require("fs");
const content = fs.readFileSync("frontend/src/components/UnifiedInvoiceForm.jsx", "utf8");
console.log("Lines:", content.split("\n").length);
console.log("Last 200 chars:", JSON.stringify(content.slice(-200)));
