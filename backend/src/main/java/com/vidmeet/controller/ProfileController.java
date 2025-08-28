package com.vidmeet.controller;

import com.vidmeet.model.User;
import com.vidmeet.repository.UserRepository;
import com.vidmeet.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(origins = "http://localhost:3000")
public class ProfileController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    // Get user profile
    @GetMapping
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            User user = userRepository.findByEmail(email);
            
            if (user == null) {
                return ResponseEntity.badRequest().body("❌ User not found.");
            }

            Map<String, Object> profile = new HashMap<>();
            profile.put("id", user.getId());
            profile.put("email", user.getEmail());
            profile.put("fullName", user.getFullName());
            profile.put("displayName", user.getDisplayName());
            profile.put("bio", user.getBio());
            profile.put("avatarUrl", user.getAvatarUrl());
            profile.put("phoneNumber", user.getPhoneNumber());
            profile.put("location", user.getLocation());
            profile.put("company", user.getCompany());
            profile.put("jobTitle", user.getJobTitle());
            profile.put("website", user.getWebsite());
            profile.put("socialLinks", user.getSocialLinks());
            profile.put("preferences", user.getPreferences());
            profile.put("createdAt", user.getCreatedAt());
            profile.put("lastLogin", user.getLastLogin());
            profile.put("isOnline", user.getIsOnline());
            profile.put("status", user.getStatus());

            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("❌ Error fetching profile: " + e.getMessage());
        }
    }

    // Update user profile
    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestHeader("Authorization") String token, @RequestBody Map<String, Object> profileData) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            User user = userRepository.findByEmail(email);
            
            if (user == null) {
                return ResponseEntity.badRequest().body("❌ User not found.");
            }

            // Update profile fields
            if (profileData.containsKey("fullName")) {
                user.setFullName((String) profileData.get("fullName"));
            }
            if (profileData.containsKey("displayName")) {
                user.setDisplayName((String) profileData.get("displayName"));
            }
            if (profileData.containsKey("bio")) {
                user.setBio((String) profileData.get("bio"));
            }
            if (profileData.containsKey("avatarUrl")) {
                user.setAvatarUrl((String) profileData.get("avatarUrl"));
            }
            if (profileData.containsKey("phoneNumber")) {
                user.setPhoneNumber((String) profileData.get("phoneNumber"));
            }
            if (profileData.containsKey("location")) {
                user.setLocation((String) profileData.get("location"));
            }
            if (profileData.containsKey("company")) {
                user.setCompany((String) profileData.get("company"));
            }
            if (profileData.containsKey("jobTitle")) {
                user.setJobTitle((String) profileData.get("jobTitle"));
            }
            if (profileData.containsKey("website")) {
                user.setWebsite((String) profileData.get("website"));
            }
            if (profileData.containsKey("socialLinks")) {
                user.setSocialLinks((String) profileData.get("socialLinks"));
            }
            if (profileData.containsKey("preferences")) {
                user.setPreferences((String) profileData.get("preferences"));
            }

            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);

            return ResponseEntity.ok("✅ Profile updated successfully!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("❌ Error updating profile: " + e.getMessage());
        }
    }

    // Update online status
    @PutMapping("/online-status")
    public ResponseEntity<?> updateOnlineStatus(@RequestHeader("Authorization") String token, @RequestBody Map<String, Boolean> statusData) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            User user = userRepository.findByEmail(email);
            
            if (user == null) {
                return ResponseEntity.badRequest().body("❌ User not found.");
            }

            Boolean isOnline = statusData.get("isOnline");
            if (isOnline != null) {
                user.setIsOnline(isOnline);
                if (isOnline) {
                    user.setLastLogin(LocalDateTime.now());
                }
                user.setUpdatedAt(LocalDateTime.now());
                userRepository.save(user);
            }

            return ResponseEntity.ok("✅ Online status updated!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("❌ Error updating online status: " + e.getMessage());
        }
    }

    // Get user by email (for meeting participants)
    @GetMapping("/user/{email}")
    public ResponseEntity<?> getUserByEmail(@PathVariable String email) {
        try {
            User user = userRepository.findByEmail(email);
            
            if (user == null) {
                return ResponseEntity.badRequest().body("❌ User not found.");
            }

            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", user.getId());
            userInfo.put("email", user.getEmail());
            userInfo.put("fullName", user.getFullName());
            userInfo.put("displayName", user.getDisplayName());
            userInfo.put("avatarUrl", user.getAvatarUrl());
            userInfo.put("company", user.getCompany());
            userInfo.put("jobTitle", user.getJobTitle());
            userInfo.put("isOnline", user.getIsOnline());

            return ResponseEntity.ok(userInfo);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("❌ Error fetching user: " + e.getMessage());
        }
    }
}

