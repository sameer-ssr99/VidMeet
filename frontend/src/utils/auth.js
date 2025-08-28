// src/utils/auth.js
import { jwtDecode } from 'jwt-decode';


export const getUserData = async () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    // decoded.sub should be email if your backend sets that subject
    return { email: decoded.sub || decoded.email || null };
  } catch (err) {
    console.error("Failed to decode token:", err);
    return null;
  }
};
