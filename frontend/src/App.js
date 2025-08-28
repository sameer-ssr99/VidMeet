// src/App.js
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Room from "./pages/Room";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./utils/ProtectedRoute";
import Navbar from "./components/Navbar";

function AppContent() {
  const location = useLocation();
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  useEffect(() => {
    const syncToken = () => setToken(localStorage.getItem("token"));
    window.addEventListener("storage", syncToken);
    return () => window.removeEventListener("storage", syncToken);
  }, []);

  const syncToken = () => setToken(localStorage.getItem("token"));

  // Hide Navbar on login & register pages
  const hideNavbar =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <>
      {!hideNavbar && token && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login onLogin={syncToken} />} />
        <Route path="/register" element={<Register onRegister={syncToken} />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute token={token}>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute token={token}>
              <Room />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
