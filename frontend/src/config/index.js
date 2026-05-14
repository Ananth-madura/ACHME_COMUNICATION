const getApiUrl = () => {
  if (process.env.NODE_ENV === "production") return "";
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:5000`;
};

const API = getApiUrl();

export { API };
