import React from "react";
import { useParams } from "react-router-dom";
import Invoice from "../components/invoicetemplate";

/**
 * Standalone invoice preview page — no sidebar/navbar.
 * Used by Puppeteer PDF generator to capture exact design.
 * The .invoice-pdf-root class is used to measure content height.
 */
const InvoicePreview = () => {
  const { type, id } = useParams();

  return (
    <div
      className="invoice-pdf-root"
      style={{ margin: 0, padding: 0, background: "#fff", width: "210mm" }}
    >
      <Invoice quotationId={id} type={type} pdfMode={true} />
    </div>
  );
};

export default InvoicePreview;
