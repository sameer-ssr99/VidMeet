// src/pages/Room.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserData } from '../utils/auth';
import axiosInstance from '../utils/axios';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isConnecting, setIsConnecting] = useState(true);
  const [joinRequests, setJoinRequests] = useState([]);
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [showKickModal, setShowKickModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  
  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const chatRef = useRef(null);

  // WebRTC Configuration
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    (async () => {
      const user = await getUserData();
      if (!user) return navigate('/login');
      setEmail(user.email);
    })();
  }, [navigate]);

  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Please allow camera and microphone access for video conferencing.');
      }
    };

    if (isApproved) {
      initializeMedia();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isApproved]);

  // Fetch participant profiles
  const fetchParticipantProfile = async (participantEmail) => {
    try {
      const response = await axiosInstance.get(`/api/profile/user/${participantEmail}`);
      setParticipantProfiles(prev => ({
        ...prev,
        [participantEmail]: response.data
      }));
    } catch (error) {
      console.error('Error fetching participant profile:', error);
    }
  };

  useEffect(() => {
    if (!email || !roomId) return;

    // verify room exists first
    axiosInstance.get(`/api/meetings/validate-meeting/${roomId}`)
      .then(() => {
        // ok
      })
      .catch(() => {
        alert("Invalid or ended meeting ID");
        navigate('/home');
      });

    axiosInstance.get(`/api/meetings/host/${roomId}`)
      .then(res => setHostEmail(res.data.hostEmail))
      .catch(() => { /* ignore */ });

    const ws = new WebSocket(`ws://localhost:8080/ws/${roomId}?email=${encodeURIComponent(email)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnecting(false);
      // If you are the host, send an approve message to auto-approve yourself
      if (email === hostEmail) {
        ws.send(JSON.stringify({ type: 'approve', roomId }));
        setIsApproved(true);
      } else {
        // send join request
        ws.send(JSON.stringify({ type: 'join_request', email }));
      }
    };

    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);

      // Handle participant list updates
      if (data.type === 'participant-list') {
        setParticipants(data.participants || []);
        // Fetch profiles for new participants
        data.participants?.forEach(participant => {
          if (!participantProfiles[participant]) {
            fetchParticipantProfile(participant);
          }
        });
        return;
      }

      // Handle join request notifications (for host)
      if (data.type === 'join_request_notification' && email === hostEmail) {
        setJoinRequests(prev => [...prev, {
          email: data.requester,
          timestamp: data.timestamp
        }]);
        return;
      }

      // Handle chat history
      if (data.type === 'chat-history') {
        setMessages(data.messages || []);
        return;
      }

      // Handle chat messages (only add if not from self to prevent duplicates)
      if (data.type === 'chat' && data.sender !== email) {
        setMessages(prev => [...prev, data]);
        return;
      }

      // Handle WebRTC signaling
      if (data.type === 'offer') {
        handleOffer(data);
      } else if (data.type === 'answer') {
        handleAnswer(data);
      } else if (data.type === 'ice-candidate') {
        handleIceCandidate(data);
      }

      // If host receives a join request, auto-approve the requester
      if (data.type === 'join_request' && email === hostEmail && data.email) {
        ws.send(
          JSON.stringify({ type: 'approval', email: data.email, status: 'approved', roomId })
        );
        // Add the new participant to the list
        setParticipants(prev => [...prev, data.email]);
        // Create peer connection for new participant
        createPeerConnection(data.email);
        return;
      }

      // If this client receives their approval, update state
      if (data.type === 'approval' && data.email === email) {
        setIsApproved(data.status === 'approved');
        if (data.status !== 'approved') {
          alert('You were not approved to join.');
          navigate('/home');
        }
      }

      // Handle kick notifications
      if (data.type === 'kicked' && data.email === email) {
        alert(`You have been kicked from the meeting by ${data.kickedBy}. Reason: ${data.reason}`);
        navigate('/home');
        return;
      }

      // Handle participant kicked notifications
      if (data.type === 'participant_kicked') {
        setParticipants(prev => prev.filter(p => p !== data.participantEmail));
        // Remove from remote streams
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[data.participantEmail];
          return newStreams;
        });
        return;
      }
    };

    ws.onclose = () => { /* closed */ };

    return () => {
      ws.close();
    };
  }, [email, roomId, hostEmail, navigate, participantProfiles]);

  // WebRTC Functions
  const createPeerConnection = (participantEmail) => {
    const pc = new RTCPeerConnection(configuration);
    peerConnections.current[participantEmail] = pc;

    // Add local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming streams
    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [participantEmail]: event.streams[0]
      }));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: participantEmail,
          from: email
        }));
      }
    };

    return pc;
  };

  const handleOffer = async (data) => {
    const pc = createPeerConnection(data.from);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    wsRef.current.send(JSON.stringify({
      type: 'answer',
      answer: answer,
      to: data.from,
      from: email
    }));
  };

  const handleAnswer = async (data) => {
    const pc = peerConnections.current[data.from];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  };

  const handleIceCandidate = async (data) => {
    const pc = peerConnections.current[data.from];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };

  // Host Control Functions
  const acceptJoinRequest = (requesterEmail) => {
    wsRef.current.send(JSON.stringify({
      type: 'accept_join_request',
      requesterEmail: requesterEmail
    }));
    setJoinRequests(prev => prev.filter(req => req.email !== requesterEmail));
  };

  const rejectJoinRequest = (requesterEmail, reason = 'Request denied') => {
    wsRef.current.send(JSON.stringify({
      type: 'reject_join_request',
      requesterEmail: requesterEmail,
      reason: reason
    }));
    setJoinRequests(prev => prev.filter(req => req.email !== requesterEmail));
  };

  const kickParticipant = (participantEmail, reason = 'Removed by host') => {
    wsRef.current.send(JSON.stringify({
      type: 'kick_participant',
      participantEmail: participantEmail,
      reason: reason
    }));
    setShowKickModal(false);
    setSelectedParticipant(null);
  };

  // Control Functions
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const messageData = {
        type: 'chat',
        message: newMessage,
        sender: email,
        timestamp: new Date().toLocaleTimeString()
      };
      wsRef.current.send(JSON.stringify(messageData));
      // Add to local messages immediately
      setMessages(prev => [...prev, messageData]);
      setNewMessage('');
    }
  };

  const leaveMeeting = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    Object.values(peerConnections.current).forEach(pc => pc.close());
    navigate('/home');
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Connecting to meeting...</h2>
          <p className="text-gray-300">Setting up your video call ✨</p>
        </div>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="text-6xl mb-4">⏳</div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Waiting for host approval...</h2>
          <p className="text-gray-300">The host will let you in soon! 🚀</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🎥 Meeting: {roomId}
            </h1>
            <p className="text-sm text-gray-300">
              You are: {email} {email === hostEmail && '👑 (Host)'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-green-500/20 px-3 py-1 rounded-full text-sm">
              👥 {participants.length + 1} participants
            </div>
            {joinRequests.length > 0 && email === hostEmail && (
              <div className="bg-yellow-500/20 px-3 py-1 rounded-full text-sm">
                ⏳ {joinRequests.length} join request(s)
              </div>
            )}
            <button
              onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
              className="bg-blue-500/20 hover:bg-blue-500/30 px-4 py-2 rounded-full transition-all duration-200"
            >
              👥 Participants
            </button>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="bg-green-500/20 hover:bg-green-500/30 px-4 py-2 rounded-full transition-all duration-200"
            >
              💬 Chat
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Main Video Area */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {/* Local Video */}
            <div className="relative bg-black/30 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-purple-500/50">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-48 object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                {email} (You) {email === hostEmail && '👑'}
              </div>
              {isMuted && (
                <div className="absolute top-3 right-3 bg-red-500 px-2 py-1 rounded-full text-sm">
                  🔇
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {Object.entries(remoteStreams).map(([participantEmail, stream]) => (
              <div key={participantEmail} className="relative bg-black/30 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-green-500/50">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-48 object-cover"
                  ref={(el) => {
                    if (el) el.srcObject = stream;
                  }}
                />
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                  {participantEmail}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={toggleMute}
              className={`px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200 ${
                isMuted 
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' 
                  : 'bg-gray-600/50 hover:bg-gray-600/70 backdrop-blur-sm'
              }`}
            >
              {isMuted ? '🔇' : '🎤'} {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={toggleVideo}
              className={`px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200 ${
                isVideoOn 
                  ? 'bg-gray-600/50 hover:bg-gray-600/70 backdrop-blur-sm' 
                  : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25'
              }`}
            >
              {isVideoOn ? '📹' : '🚫'} {isVideoOn ? 'Stop Video' : 'Start Video'}
            </button>
            <button
              onClick={leaveMeeting}
              className="px-8 py-4 rounded-full bg-red-500 hover:bg-red-600 text-lg font-semibold transition-all duration-200 shadow-lg shadow-red-500/25"
            >
              ❌ Leave Meeting
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-black/20 backdrop-blur-lg border-l border-white/10">
          {/* Join Requests Panel (Host Only) */}
          {email === hostEmail && joinRequests.length > 0 && (
            <div className="p-6 border-b border-white/10">
              <h3 className="font-bold text-xl mb-4 flex items-center">
                ⏳ Join Requests ({joinRequests.length})
              </h3>
              <div className="space-y-3">
                {joinRequests.map((request, index) => (
                  <div key={index} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{request.email}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(request.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => acceptJoinRequest(request.email)}
                        className="flex-1 bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm font-medium transition-all duration-200"
                      >
                        ✅ Accept
                      </button>
                      <button
                        onClick={() => rejectJoinRequest(request.email)}
                        className="flex-1 bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm font-medium transition-all duration-200"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants Panel */}
          {isParticipantsOpen && (
            <div className="p-6 border-b border-white/10">
              <h3 className="font-bold text-xl mb-4 flex items-center">
                👥 Participants ({participants.length + 1})
              </h3>
              <div className="space-y-3">
                <div className="flex items-center bg-white/5 rounded-lg p-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                  <span className="font-medium">{email} (You)</span>
                  {email === hostEmail && (
                    <span className="ml-2 text-xs bg-purple-600 px-2 py-1 rounded-full">👑 Host</span>
                  )}
                </div>
                {participants.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                      <div>
                        <span>{participant}</span>
                        {participantProfiles[participant] && (
                          <div className="text-xs text-gray-400">
                            {participantProfiles[participant].displayName || participantProfiles[participant].fullName}
                          </div>
                        )}
                      </div>
                    </div>
                    {email === hostEmail && participant !== email && (
                      <button
                        onClick={() => {
                          setSelectedParticipant(participant);
                          setShowKickModal(true);
                        }}
                        className="bg-red-500/20 hover:bg-red-500/30 px-2 py-1 rounded text-xs transition-all duration-200"
                      >
                        🚫 Kick
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Panel */}
          {isChatOpen && (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-white/10">
                <h3 className="font-bold text-xl flex items-center">
                  💬 Chat
                </h3>
              </div>
              
              <div 
                ref={chatRef}
                className="flex-1 p-6 overflow-y-auto space-y-4"
                style={{ maxHeight: '500px' }}
              >
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <div className="text-4xl mb-2">💬</div>
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div key={index} className={`${msg.sender === email ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block max-w-xs px-4 py-3 rounded-2xl ${
                        msg.sender === email 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                          : 'bg-white/10 backdrop-blur-sm text-white'
                      }`}>
                        <div className="text-xs opacity-75 mb-1">{msg.sender}</div>
                        <div className="font-medium">{msg.message}</div>
                        <div className="text-xs opacity-75 mt-1">{msg.timestamp}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-white/10">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-full text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:border-purple-500 transition-all duration-200"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kick Modal */}
      {showKickModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">🚫 Kick Participant</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to kick <strong>{selectedParticipant}</strong> from the meeting?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => kickParticipant(selectedParticipant)}
                className="flex-1 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium transition-all duration-200"
              >
                Yes, Kick
              </button>
              <button
                onClick={() => {
                  setShowKickModal(false);
                  setSelectedParticipant(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
