import { io } from 'socket.io-client';

let socket = null;

/**
 * Initializes socket connection and joins room.
 * @param {string} roomId - The ID of the room to join.
 * @param {string} userId - The unique user ID (host or guest).
 * @param {string} userType - "host" or "guest".
 * @param {function} onJoinApproved - Callback when guest is approved.
 * @param {function} onJoinRejected - Callback when guest is rejected.
 * @param {function} onJoinRequest - Host-only callback when a new guest requests to join.
 */
export function initSocket({
  roomId,
  userId,
  userType,
  onJoinApproved,
  onJoinRejected,
  onJoinRequest
}) {
  socket = io('http://localhost:5000');

  socket.on('connect', () => {
    console.log('🔌 Connected to socket server');
    socket.emit('join-room', { roomId, userId, userType });
  });

  // Host receives join request from guest
  socket.on('joinRequest', ({ guestId }) => {
    console.log(`📨 Join request from ${guestId}`);
    if (userType === 'host' && onJoinRequest) {
      onJoinRequest(guestId);
    }
  });

  // Guest receives approval or rejection
  socket.on('joinApproved', () => {
    console.log('✅ Join approved');
    if (onJoinApproved) onJoinApproved();
  });

  socket.on('joinRejected', () => {
    console.log('❌ Join rejected');
    if (onJoinRejected) onJoinRejected();
  });

  return socket;
}

export function getSocket() {
  return socket;
}

/**
 * Called by the host to approve a guest
 * @param {string} guestId - ID of the guest to approve
 */
export function approveGuest(guestId) {
  if (socket) {
    socket.emit('joinResponse', { guestId, approved: true });
  }
}

/**
 * Called by the host to reject a guest
 * @param {string} guestId - ID of the guest to reject
 */
export function rejectGuest(guestId) {
  if (socket) {
    socket.emit('joinResponse', { guestId, approved: false });
  }
}
