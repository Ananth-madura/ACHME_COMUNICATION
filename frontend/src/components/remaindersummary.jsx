import React,{useState} from "react";
import"../Styles/tailwind.css";

const Remainder = ({data,notes}) =>{
      const [activeTab3, setActiveTab3] = useState("Todays");
    
    const remainderupTabs = [
    { label: "Todays", count: data?.Todays|| 0, color: "bg-orange-500",text: "text-orange-500"},
    { label: "Due", count: data?.Due|| 0, color: "bg-green-600",text: "text-green-600" },
    { label: "Overdue", count: data?.Overdue|| 0, color: "bg-red-600",text: "text-red-600" },
  ];

  // 
     const remainderupBottomText = (count, type) => {
    if (count === 0) {
    if (type === "Overdue") return "No Overdue Followups";
    return `No Followups ${type}`;
  }
  return `${count} ${type} Followups`;
};
    return(
      <div className="w-[90%] card p-8 ml-">

          <h2 className="text-center text-ink font-semibold text-lg mb-6">
            Remainder Summary
          </h2>

          <div className="flex justify-center gap-4">
            {remainderupTabs.map((item) => (
              <div
                key={item.label}
                className="cursor-pointer text-center"
                onClick={() => setActiveTab3(item.label)}
              >
                <span
                  className={`reaminder-font ${
                    activeTab3 === item.label ? item.text : "text-slate"

                  }`}
                >
                  {item.label}
                </span>

                <span
                  className={`ml-2 text-white px-2 py-[2px] text-sm rounded-full ${item.color}`}
                >
                  {item.count}
                </span>

                {activeTab3 === item.label && (
                  <span className="active-line"></span>
                )}
              </div>
            ))}
          </div>

          <div className="border-t w-full mt-6 mb-6 border-hairline"></div>

          <div className="text-center">
          {notes?.[activeTab3]?.length > 0 ? (
          <p className="text-sm text-ink font-medium">
            {notes[activeTab3][0].reminder_notes}
            <div className="w-3 h-3 bg-brand-orange rounded-full relative top-[-15px] left-[120px] "></div>
          </p>
        ) : (
          <p className="text-ink text-sm">
          <div className="w-3 h-3 bg-brand-orange rounded-full relative top-[17px] left-[80px] "></div>
            {remainderupBottomText(data?.[activeTab3] || 0, activeTab3)}
          </p>
        )}
      </div>
        </div>
    )
};
export default Remainder;