package com.vidmeet.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vidmeet.model.ChatMessage;
import com.vidmeet.repository.ChatRepository;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin("*")
public class ChatController {

  @Autowired
  private ChatRepository repo;

  @PostMapping("/save")
  public ChatMessage saveChat(@RequestBody ChatMessage msg) {
    return repo.save(msg);
  }

  @GetMapping("/room/{roomId}")
  public List<ChatMessage> getChat(@PathVariable String roomId) {
    return repo.findByRoomId(roomId);
  }
}



