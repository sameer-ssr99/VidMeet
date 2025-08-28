package com.vidmeet.repository;

import com.vidmeet.model.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {
    Meeting findByRoomId(String roomId);
}
