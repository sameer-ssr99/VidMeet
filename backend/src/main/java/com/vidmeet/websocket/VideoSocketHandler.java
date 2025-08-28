package com.vidmeet.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class VideoSocketHandler extends TextWebSocketHandler {

    public static final Map<String, Set<String>> roomParticipants = new ConcurrentHashMap<>();
    public static final Map<String, List<ChatMessage>> roomMessages = new ConcurrentHashMap<>();
    public static final Map<String, String> roomHosts = new ConcurrentHashMap<>(); // roomId -> hostEmail
    public static final Map<String, List<JoinRequest>> pendingJoinRequests = new ConcurrentHashMap<>();
    private final Map<String, List<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String roomId = getRoomId(session);
        String email = getEmail(session);

        rooms.computeIfAbsent(roomId, k -> new ArrayList<>()).add(session);
        roomParticipants.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(email);
        
        // Send current participant list to all clients
        broadcastParticipantList(roomId);
        
        // Send chat history to new participant
        sendChatHistory(session, roomId);
        
        System.out.println("✅ " + email + " joined room " + roomId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String roomId = getRoomId(session);
        String email = getEmail(session);
        String payload = message.getPayload();
        
        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            String type = (String) data.get("type");
            
            switch (type) {
                case "chat":
                    handleChatMessage(roomId, email, data);
                    break;
                case "join_request":
                    handleJoinRequest(roomId, email, data);
                    break;
                case "approval":
                    handleApproval(roomId, email, data);
                    break;
                case "kick_participant":
                    handleKickParticipant(roomId, email, data);
                    break;
                case "accept_join_request":
                    handleAcceptJoinRequest(roomId, email, data);
                    break;
                case "reject_join_request":
                    handleRejectJoinRequest(roomId, email, data);
                    break;
                case "offer":
                case "answer":
                case "ice-candidate":
                    // WebRTC signaling - broadcast to all except sender
                    broadcastToOthers(session, roomId, payload);
                    break;
                default:
                    // Broadcast to all in room
                    broadcastToAll(roomId, payload);
            }
        } catch (Exception e) {
            System.err.println("Error handling message: " + e.getMessage());
        }
    }

    private void handleChatMessage(String roomId, String sender, Map<String, Object> data) {
        // Create chat message
        ChatMessage chatMessage = new ChatMessage(
            (String) data.get("message"),
            sender,
            new Date()
        );
        
        // Store message
        roomMessages.computeIfAbsent(roomId, k -> new ArrayList<>()).add(chatMessage);
        
        // Broadcast to all in room
        Map<String, Object> broadcastData = new HashMap<>();
        broadcastData.put("type", "chat");
        broadcastData.put("message", chatMessage.getMessage());
        broadcastData.put("sender", chatMessage.getSender());
        broadcastData.put("timestamp", chatMessage.getTimestamp());
        
        broadcastToAll(roomId, broadcastData);
    }

    private void handleJoinRequest(String roomId, String requester, Map<String, Object> data) {
        String hostEmail = roomHosts.get(roomId);
        
        if (hostEmail == null) {
            // No host set, auto-approve
            approveParticipant(roomId, requester);
            return;
        }
        
        // Store join request for host approval
        JoinRequest joinRequest = new JoinRequest(requester, new Date());
        pendingJoinRequests.computeIfAbsent(roomId, k -> new ArrayList<>()).add(joinRequest);
        
        // Notify host about join request
        List<WebSocketSession> clients = rooms.get(roomId);
        if (clients != null) {
            for (WebSocketSession client : clients) {
                try {
                    String clientEmail = getEmail(client);
                    if (clientEmail.equals(hostEmail)) {
                        Map<String, Object> notificationData = new HashMap<>();
                        notificationData.put("type", "join_request_notification");
                        notificationData.put("requester", requester);
                        notificationData.put("timestamp", joinRequest.getTimestamp());
                        
                        client.sendMessage(new TextMessage(objectMapper.writeValueAsString(notificationData)));
                        break;
                    }
                } catch (Exception e) {
                    System.err.println("Error notifying host: " + e.getMessage());
                }
            }
        }
    }

    private void handleApproval(String roomId, String approver, Map<String, Object> data) {
        // Broadcast approval to all
        broadcastToAll(roomId, data);
    }

    private void handleKickParticipant(String roomId, String kicker, Map<String, Object> data) {
        String hostEmail = roomHosts.get(roomId);
        String participantToKick = (String) data.get("participantEmail");
        
        // Only host can kick participants
        if (!kicker.equals(hostEmail)) {
            return;
        }
        
        // Remove participant from room
        Set<String> participants = roomParticipants.get(roomId);
        if (participants != null) {
            participants.remove(participantToKick);
        }
        
        // Close participant's WebSocket connection
        List<WebSocketSession> clients = rooms.get(roomId);
        if (clients != null) {
            for (WebSocketSession client : clients) {
                try {
                    String clientEmail = getEmail(client);
                    if (clientEmail.equals(participantToKick)) {
                        client.close();
                        break;
                    }
                } catch (Exception e) {
                    System.err.println("Error kicking participant: " + e.getMessage());
                }
            }
        }
        
        // Notify kicked participant
        Map<String, Object> kickNotification = new HashMap<>();
        kickNotification.put("type", "kicked");
        kickNotification.put("reason", data.get("reason"));
        kickNotification.put("kickedBy", kicker);
        
        // Broadcast updated participant list
        broadcastParticipantList(roomId);
        
        // Send kick notification to all remaining participants
        Map<String, Object> broadcastData = new HashMap<>();
        broadcastData.put("type", "participant_kicked");
        broadcastData.put("participantEmail", participantToKick);
        broadcastData.put("kickedBy", kicker);
        broadcastData.put("reason", data.get("reason"));
        
        broadcastToAll(roomId, broadcastData);
    }

    private void handleAcceptJoinRequest(String roomId, String host, Map<String, Object> data) {
        String hostEmail = roomHosts.get(roomId);
        String requester = (String) data.get("requesterEmail");
        
        // Only host can accept join requests
        if (!host.equals(hostEmail)) {
            return;
        }
        
        // Remove from pending requests
        List<JoinRequest> requests = pendingJoinRequests.get(roomId);
        if (requests != null) {
            requests.removeIf(req -> req.getRequesterEmail().equals(requester));
        }
        
        // Approve the participant
        approveParticipant(roomId, requester);
    }

    private void handleRejectJoinRequest(String roomId, String host, Map<String, Object> data) {
        String hostEmail = roomHosts.get(roomId);
        String requester = (String) data.get("requesterEmail");
        String reason = (String) data.get("reason");
        
        // Only host can reject join requests
        if (!host.equals(hostEmail)) {
            return;
        }
        
        // Remove from pending requests
        List<JoinRequest> requests = pendingJoinRequests.get(roomId);
        if (requests != null) {
            requests.removeIf(req -> req.getRequesterEmail().equals(requester));
        }
        
        // Notify requester about rejection
        Map<String, Object> rejectionData = new HashMap<>();
        rejectionData.put("type", "join_rejected");
        rejectionData.put("reason", reason);
        rejectionData.put("rejectedBy", host);
        
        // Find requester's session and send rejection
        List<WebSocketSession> clients = rooms.get(roomId);
        if (clients != null) {
            for (WebSocketSession client : clients) {
                try {
                    String clientEmail = getEmail(client);
                    if (clientEmail.equals(requester)) {
                        client.sendMessage(new TextMessage(objectMapper.writeValueAsString(rejectionData)));
                        client.close();
                        break;
                    }
                } catch (Exception e) {
                    System.err.println("Error rejecting join request: " + e.getMessage());
                }
            }
        }
    }

    private void approveParticipant(String roomId, String participantEmail) {
        // Add to participants
        roomParticipants.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(participantEmail);
        
        // Send approval message
        Map<String, Object> approvalData = new HashMap<>();
        approvalData.put("type", "approval");
        approvalData.put("email", participantEmail);
        approvalData.put("status", "approved");
        approvalData.put("roomId", roomId);
        
        broadcastToAll(roomId, approvalData);
        
        // Update participant list
        broadcastParticipantList(roomId);
    }

    private void broadcastToAll(String roomId, Object data) {
        try {
            String message = objectMapper.writeValueAsString(data);
            List<WebSocketSession> clients = rooms.get(roomId);
            if (clients != null) {
                for (WebSocketSession client : clients) {
                    if (client.isOpen()) {
                        client.sendMessage(new TextMessage(message));
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error broadcasting message: " + e.getMessage());
        }
    }

    private void broadcastToOthers(WebSocketSession sender, String roomId, String message) {
        List<WebSocketSession> clients = rooms.get(roomId);
        if (clients != null) {
            for (WebSocketSession client : clients) {
                if (client.isOpen() && !client.equals(sender)) {
                    try {
                        client.sendMessage(new TextMessage(message));
                    } catch (Exception e) {
                        System.err.println("Error sending to client: " + e.getMessage());
                    }
                }
            }
        }
    }

    private void broadcastParticipantList(String roomId) {
        Set<String> participants = roomParticipants.get(roomId);
        if (participants != null) {
            Map<String, Object> data = new HashMap<>();
            data.put("type", "participant-list");
            data.put("participants", new ArrayList<>(participants));
            broadcastToAll(roomId, data);
        }
    }

    private void sendChatHistory(WebSocketSession session, String roomId) {
        List<ChatMessage> messages = roomMessages.get(roomId);
        if (messages != null && !messages.isEmpty()) {
            try {
                Map<String, Object> data = new HashMap<>();
                data.put("type", "chat-history");
                data.put("messages", messages);
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(data)));
            } catch (Exception e) {
                System.err.println("Error sending chat history: " + e.getMessage());
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String roomId = getRoomId(session);
        String email = getEmail(session);

        List<WebSocketSession> clients = rooms.get(roomId);
        if (clients != null) {
            clients.remove(session);
            if (clients.isEmpty()) rooms.remove(roomId);
        }

        Set<String> participants = roomParticipants.get(roomId);
        if (participants != null) {
            participants.remove(email);
            if (participants.isEmpty()) {
                roomParticipants.remove(roomId);
                roomMessages.remove(roomId); // Clear messages when room is empty
                roomHosts.remove(roomId); // Clear host when room is empty
                pendingJoinRequests.remove(roomId); // Clear pending requests
            }
        }

        // Update participant list for remaining users
        broadcastParticipantList(roomId);
        
        System.out.println("❌ " + email + " left room " + roomId);
    }

    private String getRoomId(WebSocketSession session) {
        return Objects.requireNonNull(session.getUri()).getPath().split("/")[2];
    }

    private String getEmail(WebSocketSession session) {
        String query = session.getUri().getQuery();
        if (query != null) {
            for (String param : query.split("&")) {
                if (param.startsWith("email=")) {
                    return param.substring("email=".length());
                }
            }
        }
        return "Unknown";
    }

    // Inner class for chat messages
    public static class ChatMessage {
        private String message;
        private String sender;
        private Date timestamp;

        public ChatMessage(String message, String sender, Date timestamp) {
            this.message = message;
            this.sender = sender;
            this.timestamp = timestamp;
        }

        public String getMessage() { return message; }
        public String getSender() { return sender; }
        public Date getTimestamp() { return timestamp; }
    }

    // Inner class for join requests
    public static class JoinRequest {
        private String requesterEmail;
        private Date timestamp;

        public JoinRequest(String requesterEmail, Date timestamp) {
            this.requesterEmail = requesterEmail;
            this.timestamp = timestamp;
        }

        public String getRequesterEmail() { return requesterEmail; }
        public Date getTimestamp() { return timestamp; }
    }
}
