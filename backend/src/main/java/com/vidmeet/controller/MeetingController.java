package com.vidmeet.controller;

import com.vidmeet.model.Meeting;
import com.vidmeet.model.MeetingParticipantRequest;
import com.vidmeet.repository.MeetingRepository;
import com.vidmeet.security.JwtUtil;
import com.vidmeet.websocket.VideoSocketHandler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/meetings")
@CrossOrigin(origins = "*")
public class MeetingController {

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private JwtUtil jwtUtil;

    // ✅ Create Meeting
    @PostMapping("/create")
    public ResponseEntity<?> createMeeting(@RequestHeader("Authorization") String token, @RequestBody Map<String, String> request) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            String roomId = request.get("roomId");
            
            if (roomId == null || roomId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("❌ Room ID is required.");
            }

            // Check if meeting already exists
            Meeting existingMeeting = meetingRepository.findByRoomId(roomId);
            if (existingMeeting != null) {
                return ResponseEntity.badRequest().body("❌ Meeting with this Room ID already exists.");
            }

            Meeting meeting = new Meeting();
            meeting.setRoomId(roomId);
            meeting.setHost(email);
            meeting.setEmail(email);
            meeting.setName("Meeting " + roomId);
            meeting.setJoinedAt(LocalDateTime.now());
            meeting.setActive(true);
            
            meetingRepository.save(meeting);
            
            // Set host in WebSocket handler
            VideoSocketHandler.roomHosts.put(roomId, email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "✅ Meeting created successfully!");
            response.put("roomId", roomId);
            response.put("host", email);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("❌ Error creating meeting: " + e.getMessage());
        }
    }


    // ✅ Join meeting
    @PostMapping("/join")
    public ResponseEntity<?> joinMeeting(@RequestBody MeetingParticipantRequest request) {
        try {
            Meeting meeting = meetingRepository.findByRoomId(request.getRoomId());

            if (meeting == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("⚠️ Meeting not found.");
            }

            if (meeting.getParticipants() == null) {
                meeting.setParticipants(new ArrayList<>());
            }

            if (!meeting.getParticipants().contains(request.getEmail())) {
                meeting.getParticipants().add(request.getEmail());
                meetingRepository.save(meeting);
            }

            return ResponseEntity.ok("✅ Joined successfully.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("❌ Error joining meeting: " + e.getMessage());
        }
    }

    // ✅ Validate meeting
    @GetMapping("/validate-meeting/{roomId}")
    public ResponseEntity<?> validateMeeting(@PathVariable String roomId) {
        Meeting meeting = meetingRepository.findByRoomId(roomId);
        if (meeting != null) {
            return ResponseEntity.ok(true);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ Invalid or Ended meeting ID.");
        }
    }

    // ✅ Get host email for a room
    @GetMapping("/host/{roomId}")
    public ResponseEntity<?> getHostForRoom(@PathVariable String roomId) {
        Meeting meeting = meetingRepository.findByRoomId(roomId);
        if (meeting == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("⚠️ Meeting not found.");
        }
        Map<String, String> response = new HashMap<>();
        response.put("hostEmail", meeting.getHost());
        return ResponseEntity.ok(response);
    }

    // ✅ Get all active meetings
    @GetMapping("/active-meetings")
    public List<Meeting> getAllMeetings() {
        return meetingRepository.findAll();
    }
}
