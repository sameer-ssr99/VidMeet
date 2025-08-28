// src/utils/axios.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:8080", // apna backend URL
});

// Automatically attach token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Soft-handle 401s: clear credentials but don't force navigation.
      // Let pages/route guards decide where to go to avoid unwanted redirects.
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
