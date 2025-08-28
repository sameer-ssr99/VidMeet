// src/pages/CreateMeeting.jsx

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreateMeeting = () => {
  const [meetingName, setMeetingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated. Please log in.');
      return;
    }

    if (!meetingName.trim()) {
      setError('Meeting name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        'http://localhost:8080/api/meetings/create',
        { meetingName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { roomId } = response.data;
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error(err);
      setError('❌ Failed to create meeting. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2>Create a New Meeting</h2>
      <input
        type="text"
        placeholder="Enter meeting name"
        value={meetingName}
        onChange={(e) => setMeetingName(e.target.value)}
        style={{ padding: '0.5rem', width: '300px', marginBottom: '1rem' }}
      />
      <br />
      <button onClick={handleCreate} disabled={loading} style={{ padding: '0.5rem 1rem' }}>
        {loading ? 'Creating...' : 'Create Meeting'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
};

export default CreateMeeting;
