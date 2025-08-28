// src/components/Navbar.jsx
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="bg-white shadow p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">VidMeet</h1>
      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-gray-700">Hi, {user.name || user.email}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
