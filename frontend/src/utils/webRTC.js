export function webRTC(socket, videoRef) {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      videoRef.current.srcObject = stream;
      socket.emit('ready');
    })
    .catch((err) => {
      console.error('Media error:', err);
    });
} 
