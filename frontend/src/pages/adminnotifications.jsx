import React, { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle, XCircle, Clock, User, Edit, Lock } from "lucide-react";

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/auth/notifications");
      setNotifications(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchChangeRequests = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/auth/profile-change-requests");
      setChangeRequests(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchNotifications(); fetchChangeRequests(); }, []);

  const handleAction = async (userId, action, notifId) => {
    if (!userId) { alert("User ID missing — cannot perform action"); return; }
    try {
      await axios.put(`http://localhost:3000/api/auth/approve/${userId}`, { action });
      await axios.put(`http://localhost:3000/api/auth/notifications/${notifId}/read`);
      window.dispatchEvent(new Event("refresh-pending-count"));
      fetchNotifications();
    } catch (err) {
      console.error("Action error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Action failed: " + err.message);
    }
  };

  const handleProfileChange = async (requestId, action) => {
    try {
      await axios.put(`http://localhost:3000/api/auth/handle-change-request/${requestId}`, { action });
      window.dispatchEvent(new Event("refresh-pending-count"));
      fetchChangeRequests();
    } catch (err) {
      console.error("Change request error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Action failed");
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "---";

  const getFieldLabel = (field) => {
    switch (field) {
      case "first_name": return "Name";
      case "email": return "Email";
      case "mobile_number": return "Mobile Number";
      case "emp_address": return "Address";
      case "password": return "Password";
      default: return field;
    }
  };

  const unread = notifications.filter(n => n.is_read === 0).length;

  return (
    <div className="w-full p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-[#1694CE]">Notifications</h2>
        {unread + changeRequests.length > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{unread + changeRequests.length} new</span>
        )}
      </div>

      {changeRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Edit size={20} className="text-purple-600" /> Profile Change Requests
          </h3>
          <div className="space-y-4">
            {changeRequests.map(cr => (
              <div key={cr.id} className="bg-white rounded-xl border border-purple-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      {cr.field === "password" ? <Lock size={18} className="text-purple-600" /> : <Edit size={18} className="text-purple-600" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{cr.first_name} <span className="text-gray-400 font-normal text-sm">({cr.email})</span></p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Requested to change: <span className="font-semibold text-gray-700">{getFieldLabel(cr.field)}</span>
                        {cr.field !== "password" && (
                          <span className="ml-2 text-green-600">→ {cr.new_value}</span>
                        )}
                        {cr.field === "password" && (
                          <span className="ml-2 text-green-600">Password changed</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={11} /> {formatDate(cr.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleProfileChange(cr.id, "approved")}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition"
                    >
                      <CheckCircle size={15} /> Approve
                    </button>
                    <button
                      onClick={() => handleProfileChange(cr.id, "declined")}
                      className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition"
                    >
                      <XCircle size={15} /> Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-10">Loading...</div>
      ) : notifications.length === 0 && changeRequests.length === 0 ? (
        <div className="text-center text-gray-400 py-10 italic">No notifications yet.</div>
      ) : (
        <div className="space-y-4">
          {notifications.map(n => (
            <div key={n.id} className={`bg-white rounded-xl border shadow-sm p-5 transition ${!n.is_read ? "border-blue-200 bg-blue-50/30" : "border-gray-100"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    n.status === "active" ? "bg-green-100" : n.status === "rejected" ? "bg-red-100" : "bg-orange-100"
                  }`}>
                    <User size={18} className={n.status === "active" ? "text-green-600" : n.status === "rejected" ? "text-red-600" : "text-orange-600"} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{n.first_name} <span className="text-gray-400 font-normal text-sm">({n.email})</span></p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Requested role: <span className="font-semibold text-gray-700 capitalize">{n.role}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={11} /> {formatDate(n.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {n.status === "pending" && n.user_id ? (
                    <>
                      <button
                        onClick={() => handleAction(n.user_id, "active", n.id)}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition"
                      >
                        <CheckCircle size={15} /> Approve
                      </button>
                      <button
                        onClick={() => handleAction(n.user_id, "rejected", n.id)}
                        className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition"
                      >
                        <XCircle size={15} /> Reject
                      </button>
                    </>
                  ) : (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      n.status === "active" ? "bg-green-100 text-green-700" :
                      n.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {n.status === "active" ? "✓ Approved" : n.status === "rejected" ? "✗ Rejected" : "No user data"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
