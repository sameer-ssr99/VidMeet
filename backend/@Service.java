@Service
@Slf4j
public class UserService implements UserDetailsService {
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    // Add this debug method
    public boolean verifyPassword(String rawPassword, String encodedPassword) {
        boolean matches = passwordEncoder.matches(rawPassword, encodedPassword);
        log.debug("Password verification - Raw: {}, Encoded: {}, Matches: {}", 
            rawPassword, encodedPassword, matches);
        return matches;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
        
        log.debug("Found user: {}", user.getEmail());
        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPassword(),
            user.isActive(),
            true, true, true,
            Collections.emptyList()
        );
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            log.debug("Login attempt for email: {}", loginRequest.getEmail());
            
            // Get user from database first
            User user = userService.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
                
            // Verify password manually first (for debugging)
            boolean passwordMatches = userService.verifyPassword(
                loginRequest.getPassword(), 
                user.getPassword()
            );
            
            if (!passwordMatches) {
                log.debug("Password mismatch for user: {}", loginRequest.getEmail());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid credentials");
            }

            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getEmail(), 
                    loginRequest.getPassword()
                )
            );
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateToken(authentication);
            
            log.debug("Login successful for user: {}", loginRequest.getEmail());
            return ResponseEntity.ok(new JwtResponse(jwt));
        } catch (Exception e) {
            log.error("Login failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("Invalid credentials");
        }
    }
}