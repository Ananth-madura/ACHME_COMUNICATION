const createUnifiedRouter = require("./unifiedInvoiceRoute");

module.exports = createUnifiedRouter({
  table: "service_estimations",
  itemsTable: "service_estimation_items",
  prefix: "SE",
  dateField: "invoice_date",
  label: "Service Estimation",
});
