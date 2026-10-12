import axios from "axios";

// Use the deployed Render backend by default.
// Set REACT_APP_API_BASE_URL in Create React App,
// or VITE_API_BASE_URL if your frontend uses Vite.
const apiBaseURL = (
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_API_BASE_URL) ||
  process.env.REACT_APP_API_BASE_URL ||
  "https://driveops-1.onrender.com/api"
).trim();

const api = axios.create({
  baseURL: apiBaseURL.replace(/\/+$/, ""),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      if (window.location.pathname !== "/log") {
        window.location.href = "/log";
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export const errMsg = (error, fallback = "Request failed") => {
  const data = error.response?.data;

  if (typeof data === "string") return data;

  return data?.message || fallback;
};