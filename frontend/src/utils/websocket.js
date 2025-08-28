export class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isConnected = false;
  }

  connect(onOpen, onMessage, onClose) {
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.isConnected = true;
        console.log('WebSocket Connected');
        onOpen();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket Message:', data);
          onMessage(event);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.socket.onclose = async () => {
        this.isConnected = false;
        console.log('WebSocket Closed, Attempt:', this.reconnectAttempts);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay
          this.connect(onOpen, onMessage, onClose);
        } else {
          console.log('Max reconnection attempts reached');
          onClose();
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      onClose();
    }
  }

  send(message) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('WebSocket send error:', error);
        return false;
      }
    }
    return false;
  }

  close() {
    if (this.socket) {
      this.isConnected = false;
      this.socket.close();
    }
  }

  isConnectedAndReady() {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }
}