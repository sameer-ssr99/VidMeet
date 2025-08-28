package com.vidmeet.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vidmeet.model.ChatMessage;

public interface ChatRepository extends JpaRepository<ChatMessage, Long> {
	  List<ChatMessage> findByRoomId(String roomId);

	}