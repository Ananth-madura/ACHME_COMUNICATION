import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config/api";

/**
 * Reusable staff dropdown that fetches from /api/teammember (public endpoint).
 *
 * Props:
 *   value        - current selected value (user_id or teammember id)
 *   onChange     - change handler (receives synthetic event with name/value)
 *   name         - input name attribute
 *   required     - whether field is required
 *   className    - CSS classes
 *   valueField   - which field to use as option value: "user_id" (default) | "id"
 *   role         - filter by emp_role (optional)
 *   placeholder  - placeholder text (default: "-- Select Staff --")
 */
const StaffSelect = ({
  value,
  onChange,
  name = "staff_name",
  required = false,
  className = "",
  valueField = "user_id",
  role: filterRole,
  placeholder = "-- Select Staff --",
}) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url = `${API}/api/teammember`;
    if (filterRole) url += `?role=${encodeURIComponent(filterRole)}`;

    axios.get(url)
      .then(res => setTeamMembers(res.data || []))
      .catch(err => console.error("Failed to fetch team members:", err))
      .finally(() => setLoading(false));
  }, [filterRole]);

  if (loading) {
    return (
      <select className={className} disabled>
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select
      name={name}
      value={value || ""}
      onChange={onChange}
      required={required}
      className={className}
    >
      <option value="">{placeholder}</option>
      {teamMembers.map(member => (
        <option key={member.id} value={member[valueField] || member.id}>
          {member.first_name} {member.last_name || ""}
          {member.job_title ? ` (${member.job_title})` : ""}
        </option>
      ))}
    </select>
  );
};

export default StaffSelect;
