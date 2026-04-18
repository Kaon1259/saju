package com.saju.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saju.server.entity.FortuneHistory;
import com.saju.server.repository.FortuneHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * fortune_history 조작 헬퍼.
 * 각 운세 서비스에서 AI 완료 콜백에서 save(...)만 호출하면 됨.
 * 유저당 최대 MAX_PER_USER건 유지 (초과 시 오래된 것부터 삭제).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FortuneHistoryService {

    private static final int MAX_PER_USER = 50;

    private final FortuneHistoryRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 히스토리 기록 저장. userId가 null이면 저장하지 않음 (게스트).
     * payload는 Map 또는 객체 — JSON 직렬화해서 저장.
     */
    @Transactional
    public void save(Long userId, String type, String title, String summary, Object payload) {
        if (userId == null || type == null || title == null) return;
        try {
            String json = objectMapper.writeValueAsString(payload);
            FortuneHistory entity = FortuneHistory.builder()
                .userId(userId)
                .type(type)
                .title(title.length() > 120 ? title.substring(0, 120) : title)
                .summary(summary != null && summary.length() > 255 ? summary.substring(0, 255) : summary)
                .payloadJson(json)
                .build();
            repository.save(entity);
            trimOldEntries(userId);
        } catch (Exception e) {
            log.warn("fortune_history save failed: {}", e.getMessage());
        }
    }

    /**
     * 동일 (userId, type, title) 기록이 이미 있으면 저장하지 않음.
     * 캐시 히트 시 '이미 본 적 있는 운세'를 히스토리에 1회만 기록하기 위한 용도.
     */
    @Transactional
    public void saveIfAbsent(Long userId, String type, String title, String summary, Object payload) {
        if (userId == null || type == null || title == null) return;
        String clippedTitle = title.length() > 120 ? title.substring(0, 120) : title;
        if (repository.existsByUserIdAndTypeAndTitle(userId, type, clippedTitle)) return;
        save(userId, type, title, summary, payload);
    }

    /**
     * 유저당 MAX_PER_USER 초과분을 오래된 순으로 삭제.
     */
    private void trimOldEntries(Long userId) {
        try {
            long count = repository.countByUserId(userId);
            if (count <= MAX_PER_USER) return;
            List<Long> all = repository.findIdsByUserIdOrderedDesc(userId, PageRequest.of(0, (int) count));
            if (all.size() > MAX_PER_USER) {
                List<Long> del = all.subList(MAX_PER_USER, all.size());
                repository.deleteByIdIn(del);
            }
        } catch (Exception e) {
            log.warn("fortune_history trim failed: {}", e.getMessage());
        }
    }
}
