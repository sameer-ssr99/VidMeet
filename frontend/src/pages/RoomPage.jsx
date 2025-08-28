// src/pages/RoomPage.jsx

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUserData } from '../utils/auth';

const RoomPage = () => {
  const { roomId } = useParams();
  const [user, setUser] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [approved, setApproved] = useState(false);
  const [host, setHost] = useState(null);
  const socketRef = useRef(null);

  // ✅ Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      const userData = await getUserData();
      setUser(userData);
    };
    fetchUser();
  }, []);

  // ✅ Setup WebSocket and message handlers
  useEffect(() => {
    if (!user || !roomId) return;

    socketRef.current = new WebSocket('ws://localhost:8080/ws');

    socketRef.current.onopen = () => {
      socketRef.current.send(
        JSON.stringify({ type: 'join', roomId, userEmail: user.email })
      );
    };

    socketRef.current.onmessage = (message) => {
      const data = JSON.parse(message.data);

      switch (data.type) {
        case 'joined':
          setParticipants(data.participants || []);
          setHost(data.host);
          break;
        case 'approve':
          setApproved(true);
          break;
        case 'participant-list':
          setParticipants(data.participants);
          break;
        default:
          break;
      }
    };

    socketRef.current.onclose = () => {
      console.log('Socket closed');
    };

    return () => {
      socketRef.current?.close();
    };
  }, [user, roomId]);

  // ✅ Host auto-approves after both host & socket are ready
  useEffect(() => {
    if (
      user &&
      host &&
      user.email === host &&
      !approved &&
      socketRef.current?.readyState === WebSocket.OPEN
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: 'approve',
          roomId,
        })
      );
      setApproved(true);
    }
  }, [user, host, approved, roomId]);

  // ✅ Loading state
  if (!user) return <div className="text-white">Loading user...</div>;

  // ✅ Waiting for approval screen
  if (!approved) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold">⏳ Waiting for host to start the meeting...</h2>
        </div>
      </div>
    );
  }

  // ✅ Meeting Room UI
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h2 className="text-2xl font-bold mb-4">Meeting Room: {roomId}</h2>
      <h3 className="mb-2">You are: {user.email}</h3>
      <div className="mt-4">
        <h4 className="font-semibold">Participants:</h4>
        <ul className="list-disc ml-6 mt-2">
          {participants.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RoomPage;

