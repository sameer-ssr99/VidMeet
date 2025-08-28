package com.vidmeet.websocket;

import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class MeetingSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    public MeetingSocketController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // Called when someone requests to join a meeting
    @MessageMapping("/join-meeting")
    public void handleJoinRequest(@Payload Map<String, String> data) {
        String roomId = data.get("roomId");
        String username = data.get("username");

        // Send join request to host (broadcast to all in room or just host)
        messagingTemplate.convertAndSend("/topic/meeting/" + roomId + "/join-request", data);
    }

    // Called when host accepts or rejects
    @MessageMapping("/host-response")
    public void handleHostResponse(@Payload Map<String, String> data) {
        String roomId = data.get("roomId");
        String username = data.get("username");
        String status = data.get("status"); // "accepted" or "rejected"

        // Notify specific user by unique queue
        messagingTemplate.convertAndSend("/queue/meeting/" + username + "/response", data);
    }
}
