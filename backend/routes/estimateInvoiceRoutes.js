const createUnifiedRouter = require("./unifiedInvoiceRoute");

module.exports = createUnifiedRouter({
  table: "estimate_invoices",
  itemsTable: "estimate_invoice_items",
  prefix: "EI",
  dateField: "invoice_date",
  label: "Estimate Invoice",
});
