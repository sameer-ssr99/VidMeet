// src/pages/Home.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axios';

const Home = () => {
  const [action, setAction] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [meetingName, setMeetingName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );
  const navigate = useNavigate();

  // Keep token state in sync in case user logs in from another tab
  useEffect(() => {
    const syncToken = () => {
      setIsAuthenticated(!!localStorage.getItem("token"));
    };
    window.addEventListener("storage", syncToken);
    return () => window.removeEventListener("storage", syncToken);
  }, []);

  const handleJoinMeeting = async () => {
    if (!roomId.trim()) {
      alert('Please enter a Meeting ID to join.');
      return;
    }
    setIsLoading(true);
    try {
      await axiosInstance.get(`/api/meetings/validate-meeting/${roomId.trim()}`);
      navigate(`/room/${roomId.trim()}`);
    } catch {
      alert('❌ Invalid or Ended Meeting ID');
    } finally {
      setIsLoading(false);
    }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleCreateMeeting = async () => {
    if (!meetingName.trim()) {
      alert('Please enter a Meeting Name.');
      return;
    }
    if (!isAuthenticated) {
      // If user not logged in, send them to login page
      navigate('/login');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/api/meetings/create', { meetingName: meetingName.trim() });
      const newRoomId = response.data.roomId;
      if (!newRoomId) throw new Error("No roomId returned");

      // Try to validate up to 5 times with exponential backoff
      let isValid = false;
      let delay = 100000;
      for (let i = 0; i < 5 && !isValid; i++) {
        try {
          await axiosInstance.get(`/api/meetings/validate-meeting/${newRoomId}`);
          isValid = true;
        } catch {
          await sleep(delay);
          delay *= 2;
        }
      }

      if (!isValid) throw new Error("Meeting creation delayed. Please try again.");
      navigate(`/room/${newRoomId}`);
    } catch (err) {
      console.error("Meeting creation error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        navigate('/login');
        return;
      }
      alert("❌ Error: " + (err.message || "Failed to create meeting"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 text-white p-4">
      <h1 className="text-4xl font-bold mb-6">Welcome to VidMeet</h1>

      {!action && (
        <div className="space-y-4 w-full max-w-md">
          <button
            onClick={() => setAction('join')}
            className="w-full bg-blue-600 px-4 py-3 rounded-xl text-lg hover:bg-blue-700"
          >
            Join a Meeting
          </button>
          <button
            onClick={() => setAction('create')}
            className="w-full bg-green-600 px-4 py-3 rounded-xl text-lg hover:bg-green-700"
          >
            Create a Meeting {!isAuthenticated && '(Login Required)'}
          </button>
        </div>
      )}

      {action === 'join' && (
        <div className="w-full max-w-md mt-6 bg-white text-black p-6 rounded-2xl shadow-lg space-y-4">
          <h2 className="text-xl font-semibold text-center">Join a Meeting</h2>
          <input
            type="text"
            placeholder="Enter Meeting ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl"
          />
          <button
            onClick={handleJoinMeeting}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-xl"
          >
            {isLoading ? 'Joining...' : 'Join Now'}
          </button>
          <button
            onClick={() => setAction(null)}
            className="w-full mt-2 bg-gray-300 text-black px-4 py-2 rounded-xl"
          >
            Back
          </button>
        </div>
      )}

      {action === 'create' && (
        <div className="w-full max-w-md mt-6 bg-white text-black p-6 rounded-2xl shadow-lg space-y-4">
          <h2 className="text-xl font-semibold text-center">Create a Meeting</h2>
          <input
            type="text"
            placeholder="Enter Meeting Name"
            value={meetingName}
            onChange={(e) => setMeetingName(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl"
          />
          <button
            onClick={handleCreateMeeting}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-xl"
          >
            {isLoading ? 'Creating...' : 'Start Meeting'}
          </button>
          <button
            onClick={() => setAction(null)}
            className="w-full mt-2 bg-gray-300 text-black px-4 py-2 rounded-xl"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
