const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === "production") return "/api";
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:5000/api`;
};

export default getApiBaseUrl();