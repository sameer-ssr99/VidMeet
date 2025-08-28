package com.vidmeet.controller;

import com.vidmeet.model.User;
import com.vidmeet.repository.UserRepository;
import com.vidmeet.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository repo;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder; // injected bean

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            if (repo.findByEmail(user.getEmail()) != null) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("⚠️ Email already registered");
            }

            user.setPassword(passwordEncoder.encode(user.getPassword()));
            User savedUser = repo.save(user);

            // Optionally generate token after registering
            String token = jwtUtil.generateToken(savedUser.getEmail());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "✅ Registered successfully");
            response.put("user", savedUser);
            response.put("token", token);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("❌ Error: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {
        try {
            User found = repo.findByEmail(user.getEmail());
            System.out.println("AuthController.login - email lookup: " + user.getEmail() + " found=" + (found != null));
            if (found != null) {
                boolean matched = passwordEncoder.matches(user.getPassword(), found.getPassword());
                System.out.println("Password match? " + matched);
                if (matched) {
                    String token = jwtUtil.generateToken(found.getEmail());

                    Map<String, Object> response = new HashMap<>();
                    response.put("message", "🎉 Login successful");
                    response.put("token", token);
                    response.put("user", found);

                    return ResponseEntity.ok(response);
                }
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("❌ Invalid credentials");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("❌ Login error: " + e.getMessage());
        }
    }

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("✅ Backend is up and running!");
    }
}
