package com.vidmeet.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class ChatMessage {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String roomId;
  private String sender;
  private String message;
  private LocalDateTime timestamp = LocalDateTime.now();
public Long getId() {
	return id;
}
public void setId(Long id) {
	this.id = id;
}
public String getRoomId() {
	return roomId;
}
public void setRoomId(String roomId) {
	this.roomId = roomId;
}
public String getSender() {
	return sender;
}
public void setSender(String sender) {
	this.sender = sender;
}
public String getMessage() {
	return message;
}
public void setMessage(String message) {
	this.message = message;
}
public LocalDateTime getTimestamp() {
	return timestamp;
}
public void setTimestamp(LocalDateTime timestamp) {
	this.timestamp = timestamp;
}
}

