import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import "../Styles/tailwind.css";

const FollowupList = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type"); 
  const [followups, setFollowups] = useState([]);

  useEffect(() => {
    axios
      .get(`http://localhost:3000/api/followups?type=${type}`)
      .then(res => setFollowups(res.data))
      .catch(console.error);
  }, [type]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">
        {type} Followups
      </h2>

      {followups.length === 0 ? (
        <p className="text-gray-500">No followups found</p>
      ) : (
        <div className="space-y-4">
          {followups.map(f => (
            <div
              key={f.id}
              className="p-4 bg-white rounded-lg shadow border"
            >
              <p className="font-semibold">
                {f.customer_name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {f.followup_notes}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Followup Date: {f.followup_date}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowupList;
