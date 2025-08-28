package com.vidmeet.websocket;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@EnableWebSocket
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer, WebSocketConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // STOMP endpoint for messaging features (optional for this app)
        registry.addEndpoint("/stomp")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Bean
    public WebSocketHandler videoSocketHandler() {
        return new VideoSocketHandler();
    }

    // Native WebSocket endpoint used by frontend: ws://localhost:8080/ws/{roomId}
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Use Ant-style pattern to match any path segment after /ws/
        registry.addHandler(videoSocketHandler(), "/ws/**").setAllowedOriginPatterns("*");
    }
}
