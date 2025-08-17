// src/api/http.ts
import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000"; // your server origin
export const API_PREFIX =
  (import.meta.env.VITE_API_PREFIX || "").replace(/\/+$/, ""); // "" or "/api"

const http = axios.create({
  baseURL: API_BASE, // keep only the origin here
  withCredentials: false,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const code = err?.response?.status;
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed";
    console.error("HTTP error:", code, msg, err?.response?.data);
    return Promise.reject(err);
  }
);

export default http;
