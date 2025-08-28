import { useEffect, useState } from "react";
import axios from "axios";
import jwtDecode from "jwt-decode";

export default function Dashboard() {
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const email = jwtDecode(token).sub;

    axios.get(`http://localhost:8080/api/meetings/user/${email}`)
      .then((res) => setMeetings(res.data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📜 Meeting History</h1>
      <table className="w-full table-auto border-collapse border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Room ID</th>
            <th className="border p-2">Joined At</th>
            <th className="border p-2">Left At</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((m) => (
            <tr key={m.id}>
              <td className="border p-2">{m.roomId}</td>
              <td className="border p-2">{m.joinedAt}</td>
              <td className="border p-2">{m.leftAt || "In Progress"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
