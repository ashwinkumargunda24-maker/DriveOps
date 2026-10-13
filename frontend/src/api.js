import axios from "axios";

const apiBaseURL = (
  process.env.REACT_APP_API_BASE_URL ||
  "http://localhost:8081/api"
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