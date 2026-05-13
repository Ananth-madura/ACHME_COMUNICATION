import React, { useState } from "react";
import Quotation from "./quotation";
import PerformaInvoice from "./performainvoice";
import EstimateInvoice from "./estimateinvoice";
import ServiceEstimation from "./serviceestimation";

const TABS = [
  { key: "quotation", label: "Quotation" },
  { key: "proforma", label: "Proforma Invoice" },
  { key: "estimation", label: "Estimation" },
  { key: "service", label: "Service Estimation" },
];

const Proposal = () => {
  const [activeTab, setActiveTab] = useState("quotation");

  return (
    <div className="w-full">
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-[#1694CE] text-[#1694CE]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "quotation" && <Quotation />}
      {activeTab === "proforma" && <PerformaInvoice />}
      {activeTab === "estimation" && <EstimateInvoice />}
      {activeTab === "service" && <ServiceEstimation />}
    </div>
  );
};

export default Proposal;
