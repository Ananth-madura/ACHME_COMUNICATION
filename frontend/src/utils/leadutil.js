// utils/leadutil.js

export const getToday = () => {
  const d = new Date();
  return d.getFullYear() + '-' + 
         String(d.getMonth() + 1).padStart(2, '0') + '-' + 
         String(d.getDate()).padStart(2, '0');
};

export const normalizeDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.getFullYear() + '-' + 
         String(d.getMonth() + 1).padStart(2, '0') + '-' + 
         String(d.getDate()).padStart(2, '0');
};

export const isThisMonth = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

export const departmentCount = (data = [], key) => ({
  New: data.filter(item => item[key] === "New").length,
  Converted: data.filter(item => item[key] === "Converted").length,
  Disqualified: data.filter(item => item[key] === "Disqualified").length,
});

export const bottomText = (count, label) =>
  count === 0 ? `No ${label} Leads Today` : `${count} ${label} Leads Today`;