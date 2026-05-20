package com.saju.server.controller;

import com.saju.server.dto.UserResponse;
import com.saju.server.exception.InsufficientHeartsException;
import com.saju.server.saju.SajuResult;
import com.saju.server.security.AuthUtil;
import com.saju.server.service.*;
import com.saju.server.util.SseEmitterUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/my")
@RequiredArgsConstructor
@Slf4j
public class MyFortuneController {

    private final UserService userService;
    private final SajuService sajuService;
    private final LunarCalendarService lunarCalendarService;
    private final BloodTypeFortuneService bloodTypeFortuneService;
    private final MbtiFortuneService mbtiFortuneService;
    private final FortuneService fortuneService;
    private final ClaudeApiService claudeApiService;
    private final FortunePromptBuilder promptBuilder;
    private final HeartPointService heartPointService;
    private final FortuneHistoryService fortuneHistoryService;

    /** path userId 가 본인이 아니면 403. */
    private static void requireSelf(HttpServletRequest req, Long pathId) {
        Long uid = AuthUtil.requireUserId(req);
        if (!uid.equals(pathId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 운세만 조회할 수 있습니다.");
        }
    }

    /**
     * 나의 통합 운세 (사주 AI + 혈액형 + MBTI)
     */
    @GetMapping("/fortune/{userId}")
    public ResponseEntity<Map<String, Object>> getMyFortune(@PathVariable Long userId, HttpServletRequest req) {
        requireSelf(req, userId);
        UserResponse user = userService.getUser(userId);

        if (user.getBirthDate() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "프로필을 먼저 완성해주세요."));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        var userMap = new java.util.LinkedHashMap<String, Object>();
        userMap.put("name", user.getName());
        userMap.put("zodiacAnimal", user.getZodiacAnimal() != null ? user.getZodiacAnimal() : "");
        userMap.put("bloodType", user.getBloodType() != null ? user.getBloodType() : "");
        userMap.put("mbtiType", user.getMbtiType() != null ? user.getMbtiType() : "");
        userMap.put("birthDate", user.getBirthDate().toString());
        userMap.put("birthTime", user.getBirthTime() != null ? user.getBirthTime() : "");
        userMap.put("gender", user.getGender() != null ? user.getGender() : "");
        userMap.put("calendarType", user.getCalendarType() != null ? user.getCalendarType() : "SOLAR");
        userMap.put("relationshipStatus", user.getRelationshipStatus() != null ? user.getRelationshipStatus() : "");
        result.put("user", userMap);

        // 1. 스트리밍 캐시 먼저 확인 (운세 페이지와 동일한 점수 보장)
        LocalDate today = LocalDate.now();
        var cachedFortune = (user.getZodiacAnimal() != null)
            ? fortuneService.getCachedFortune(user.getZodiacAnimal(), today) : null;

        Map<String, Object> sajuFortune = new LinkedHashMap<>();
        boolean aiAnalyzed = false;
        boolean cacheFresh2 = cachedFortune != null
            && cachedFortune.getOverall() != null && !cachedFortune.getOverall().isBlank()
            && cachedFortune.getHourlyFortuneJson() != null && !cachedFortune.getHourlyFortuneJson().isBlank();
        if (cacheFresh2) {
            // 스트리밍 캐시 히트 → 운세 페이지와 동일한 데이터 (AI 분석 결과)
            aiAnalyzed = true;
            sajuFortune.put("overall", cachedFortune.getOverall());
            sajuFortune.put("love", cachedFortune.getLove());
            sajuFortune.put("money", cachedFortune.getMoney());
            sajuFortune.put("health", cachedFortune.getHealth());
            sajuFortune.put("work", cachedFortune.getWork());
            sajuFortune.put("score", cachedFortune.getScore());
            sajuFortune.put("loveScore", cachedFortune.getLoveScore());
            sajuFortune.put("moneyScore", cachedFortune.getMoneyScore());
            sajuFortune.put("healthScore", cachedFortune.getHealthScore());
            sajuFortune.put("workScore", cachedFortune.getWorkScore());
            sajuFortune.put("luckyNumber", cachedFortune.getLuckyNumber());
            sajuFortune.put("luckyColor", cachedFortune.getLuckyColor());
            sajuFortune.put("luckyDirection", cachedFortune.getLuckyDirection());
            sajuFortune.put("luckyFood", cachedFortune.getLuckyFood());
            sajuFortune.put("luckyFashion", cachedFortune.getLuckyFashion());
            sajuFortune.put("luckyItem", cachedFortune.getLuckyItem());
            sajuFortune.put("hourlyFortune", parseHourly(cachedFortune.getHourlyFortuneJson()));
        } else {
            // 캐시 없음 → 사주 기반 AI 분석 (첫 방문)
            LocalDate birthDate = user.getBirthDate();
            if ("LUNAR".equalsIgnoreCase(user.getCalendarType())) {
                birthDate = lunarCalendarService.lunarToSolar(birthDate);
            }
            SajuResult sajuResult = sajuService.analyze(birthDate, user.getBirthTime(), user.getGender());
            SajuResult.CategoryFortune todayFortune = sajuResult.getTodayFortune();
            if (todayFortune != null) {
                sajuFortune.put("overall", todayFortune.getOverall());
                sajuFortune.put("love", todayFortune.getLove());
                sajuFortune.put("money", todayFortune.getMoney());
                sajuFortune.put("health", todayFortune.getHealth());
                sajuFortune.put("work", todayFortune.getWork());
                sajuFortune.put("score", todayFortune.getScore());
                sajuFortune.put("luckyNumber", todayFortune.getLuckyNumber());
                sajuFortune.put("luckyColor", todayFortune.getLuckyColor());
            }
            sajuFortune.put("dayMaster", sajuResult.getDayMasterHanja() + " " + sajuResult.getDayMaster());
            sajuFortune.put("dayMasterElement", sajuResult.getDayMasterElement());
            sajuFortune.put("personalityReading", sajuResult.getPersonalityReading());
            sajuFortune.put("yearFortune", sajuResult.getYearFortune());
        }
        sajuFortune.put("zodiacAnimal", user.getZodiacAnimal());
        sajuFortune.put("fortuneDate", today.toString());
        sajuFortune.put("aiAnalyzed", aiAnalyzed); // 홈 미리보기 조건부 표시용
        result.put("saju", sajuFortune);

        // 2. 혈액형/MBTI는 각 페이지에서 개별 호출 (홈 로딩 속도 개선)

        return ResponseEntity.ok(result);
    }

    /**
     * 나의 운세 스트리밍 (사주 AI 부분)
     */
    @GetMapping(value = "/fortune/{userId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMyFortune(@PathVariable Long userId,
            @RequestParam(value = "date", required = false) String dateStr,
            @RequestParam(value = "cacheOnly", required = false, defaultValue = "false") boolean cacheOnly,
            HttpServletRequest req) {
        // [DIAG] 라이브 30s 캐시 히트 지연 원인 추적 — 각 단계별 timing 측정
        final long _t0 = System.currentTimeMillis();
        requireSelf(req, userId);
        final long _t1 = System.currentTimeMillis();
        UserResponse user = userService.getUser(userId);
        final long _t2 = System.currentTimeMillis();
        log.info("[timing-stream] uid={} cacheOnly={} requireSelf={}ms getUser={}ms",
            userId, cacheOnly, (_t1 - _t0), (_t2 - _t1));
        if (user.getBirthDate() == null || user.getZodiacAnimal() == null) {
            SseEmitter emitter = new SseEmitter(10000L);
            new Thread(() -> {
                try { emitter.send(SseEmitter.event().name("error").data("프로필을 먼저 완성해주세요.")); emitter.complete(); }
                catch (Exception ignored) {}
            }).start();
            return emitter;
        }

        LocalDate targetDate = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : LocalDate.now();

        // 캐시 체크 — 구버전 캐시(hourlyFortune 없음)는 stale로 간주하여 재생성
        final long _t3 = System.currentTimeMillis();
        var cached = fortuneService.getCachedFortune(user.getZodiacAnimal(), targetDate);
        final long _t4 = System.currentTimeMillis();
        boolean cacheFresh = cached != null
            && cached.getOverall() != null && !cached.getOverall().isBlank()
            && cached.getHourlyFortuneJson() != null && !cached.getHourlyFortuneJson().isBlank();
        log.info("[timing-stream] uid={} targetDate={} getCachedFortune={}ms cacheFresh={}",
            userId, targetDate, (_t4 - _t3), cacheFresh);
        if (cacheFresh) {
            // 빠른 사주 기본 계산 (AI 호출 없음)
            LocalDate bd = user.getBirthDate();
            if ("LUNAR".equalsIgnoreCase(user.getCalendarType())) {
                bd = lunarCalendarService.lunarToSolar(bd);
            }
            final long _t5 = System.currentTimeMillis();
            SajuResult sajuResult = sajuService.buildBasicResult(bd, user.getBirthTime(), user.getGender());
            final long _t6 = System.currentTimeMillis();

            // timeout: 5s → 30s — 캐시 히트 응답이 풀 대기 등으로 늦어져도 끊기지 않도록 여유
            SseEmitter emitter = new SseEmitter(10000L);
            final Map<String, Object> data = buildMyFortuneData(user, cached);
            final long _t7 = System.currentTimeMillis();
            log.info("[timing-stream] uid={} buildBasicResult={}ms buildMyFortuneData={}ms TOTAL_PRE_SEND={}ms",
                userId, (_t6 - _t5), (_t7 - _t6), (_t7 - _t0));
            @SuppressWarnings("unchecked")
            Map<String, Object> sajuMap = (Map<String, Object>) data.get("saju");
            if (sajuResult != null) {
                sajuMap.put("dayMaster", sajuResult.getDayMasterHanja() + " " + sajuResult.getDayMaster());
                sajuMap.put("personalityReading", sajuResult.getPersonalityReading());
            }
            // ⚡ cached 이벤트를 먼저 발사하고 → 히스토리 저장은 비동기 (DB 쓰기가 응답을 막지 않도록)
            final Long uidForHistory = userId;
            final LocalDate finalTargetDate = targetDate;
            final var cachedSnap = cached;
            final UserResponse finalUser = user;
            new Thread(() -> {
                final long _ts = System.currentTimeMillis();
                try {
                    String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(data);
                    final long _tj = System.currentTimeMillis();
                    emitter.send(SseEmitter.event().name("cached").data(json));
                    emitter.complete();
                    final long _te = System.currentTimeMillis();
                    log.info("[timing-stream] uid={} bg jsonSerialize={}ms emitterSend={}ms totalFromRequest={}ms",
                        uidForHistory, (_tj - _ts), (_te - _tj), (_te - _t0));
                } catch (Exception ignored) {}
                // 응답 완료 후 히스토리 저장 (중복 시 스킵). 실패해도 사용자 응답에 영향 없음.
                try {
                    if (uidForHistory != null) {
                        java.time.LocalDate today2 = java.time.LocalDate.now();
                        String dayLabel = finalTargetDate.equals(today2) ? "오늘"
                            : finalTargetDate.equals(today2.plusDays(1)) ? "내일"
                            : finalTargetDate.toString();
                        Map<String, Object> payload = new java.util.LinkedHashMap<>(data);
                        payload.put("targetDate", finalTargetDate.toString());
                        String summary = (cachedSnap.getScore() != null ? cachedSnap.getScore() + "점" : "")
                            + (cachedSnap.getOverall() != null ? " · " + cachedSnap.getOverall() : "");
                        String title = (finalUser.getName() != null ? finalUser.getName() + "님의 " : "") + dayLabel + " 운세 (" + finalTargetDate + ")";
                        fortuneHistoryService.saveIfAbsent(uidForHistory, "today_fortune", title, summary, payload);
                    }
                } catch (Exception e) {
                    log.warn("[MyFortune] async history save failed: {}", e.getMessage());
                }
            }).start();
            return emitter;
        }

        // cacheOnly 모드: 캐시 없으면 AI 호출 없이 no-cache 이벤트로 종료
        if (cacheOnly) {
            SseEmitter emitter = new SseEmitter(10000L);
            new Thread(() -> {
                try { emitter.send(SseEmitter.event().name("no-cache").data("{}")); emitter.complete(); }
                catch (Exception ignored) {}
            }).start();
            return emitter;
        }

        // 하트 잔액 확인 (차감은 AI 완료 후)
        try {
            heartPointService.checkPoints(userId, "TODAY_FORTUNE");
        } catch (InsufficientHeartsException e) {
            return SseEmitterUtils.insufficientHearts(e.getRequired(), e.getAvailable());
        }

        // AI 스트리밍 (연애상태 + 날짜 반영 + 나이/성별 맞춤)
        String systemPrompt = promptBuilder.fortuneStreamSystemPrompt(promptBuilder.dateLabel(targetDate)) + "\n" + FortunePromptBuilder.TARGET_AWARE_RULES;
        String personContext = promptBuilder.buildPersonContext(user.getBirthDate().toString(), user.getGender());
        String userPrompt = promptBuilder.fortuneStreamUserPrompt(user.getZodiacAnimal(), targetDate, user.getRelationshipStatus()) + personContext;
        final LocalDate finalDate = targetDate;
        final Long uid = userId;
        final UserResponse finalUser = user;
        // 비용 절감 테스트 — 오늘의 운세는 Haiku 4.5 사용 (Sonnet 대비 1/3 비용, 2~3배 속도)
        return claudeApiService.generateStream(systemPrompt, userPrompt, 2500,
                ClaudeApiService.HAIKU_MODEL, (fullText) -> {
            boolean parsed;
            try {
                parsed = fortuneService.parseAndSaveStreamResult(user.getZodiacAnimal(), fullText, finalDate);
            } catch (Exception e) {
                log.error("[onComplete] MyFortune 파싱 실패: {}", e.getMessage(), e);
                parsed = false;
            }
            if (!parsed) {
                log.warn("[NoDeduct] 파싱 실패로 차감/히스토리 스킵: cat=TODAY_FORTUNE, uid={}", uid);
                return;
            }
            if (uid != null) heartPointService.deductPoints(uid, "TODAY_FORTUNE", "오늘의 운세");
            // 히스토리 저장 — 사용자가 나중에 "최근 본 운세"에서 다시 볼 수 있게
            if (uid != null) {
                java.time.LocalDate today = java.time.LocalDate.now();
                String dayLabel = finalDate.equals(today) ? "오늘"
                    : finalDate.equals(today.plusDays(1)) ? "내일"
                    : finalDate.toString();
                var saved = fortuneService.getCachedFortune(finalUser.getZodiacAnimal(), finalDate);
                if (saved == null) {
                    // AI 응답 파싱/저장 실패 (토큰 부족으로 JSON 잘렸을 가능성) — 히스토리 저장 스킵
                    return;
                }
                Map<String, Object> payload = buildMyFortuneData(finalUser, saved);
                payload.put("targetDate", finalDate.toString());
                String summary = saved.getOverall() != null
                    ? (saved.getScore() + "점 · " + saved.getOverall())
                    : null;
                fortuneHistoryService.save(uid, "today_fortune",
                    (finalUser.getName() != null ? finalUser.getName() + "님의 " : "") + dayLabel + " 운세 (" + finalDate + ")",
                    summary, payload);
            }
        });
    }

    private Map<String, Object> buildMyFortuneData(UserResponse user, com.saju.server.dto.FortuneResponse fortune) {
        Map<String, Object> result = new LinkedHashMap<>();
        var userMap = new LinkedHashMap<String, Object>();
        userMap.put("name", user.getName());
        userMap.put("zodiacAnimal", user.getZodiacAnimal() != null ? user.getZodiacAnimal() : "");
        userMap.put("bloodType", user.getBloodType() != null ? user.getBloodType() : "");
        userMap.put("mbtiType", user.getMbtiType() != null ? user.getMbtiType() : "");
        userMap.put("birthDate", user.getBirthDate().toString());
        userMap.put("birthTime", user.getBirthTime() != null ? user.getBirthTime() : "");
        userMap.put("gender", user.getGender() != null ? user.getGender() : "");
        userMap.put("calendarType", user.getCalendarType() != null ? user.getCalendarType() : "SOLAR");
        // 연인 정보 — 운세 페이지에서 자동 채움/심화분석 등에 사용
        if (user.getPartnerBirthDate() != null) {
            userMap.put("partnerBirthDate", user.getPartnerBirthDate().toString());
            userMap.put("partnerBirthTime", user.getPartnerBirthTime() != null ? user.getPartnerBirthTime() : "");
            userMap.put("partnerCalendarType", user.getPartnerCalendarType() != null ? user.getPartnerCalendarType() : "SOLAR");
        }
        result.put("user", userMap);

        Map<String, Object> saju = new LinkedHashMap<>();
        saju.put("overall", fortune.getOverall());
        saju.put("love", fortune.getLove());
        saju.put("money", fortune.getMoney());
        saju.put("health", fortune.getHealth());
        saju.put("work", fortune.getWork());
        saju.put("academic", fortune.getAcademicFortune()); // 학업·자기계발운
        saju.put("score", fortune.getScore());
        saju.put("luckyNumber", fortune.getLuckyNumber());
        saju.put("luckyColor", fortune.getLuckyColor());
        saju.put("luckyDirection", fortune.getLuckyDirection());
        saju.put("luckyFood", fortune.getLuckyFood());
        saju.put("luckyFashion", fortune.getLuckyFashion());
        saju.put("luckyItem", fortune.getLuckyItem());
        saju.put("luckyPerson", fortune.getLuckyPerson()); // 오늘 만나면 좋은 사람
        saju.put("hourlyFortune", parseHourly(fortune.getHourlyFortuneJson()));
        saju.put("zodiacAnimal", user.getZodiacAnimal());
        result.put("saju", saju);
        return result;
    }

    private static final com.fasterxml.jackson.databind.ObjectMapper HOURLY_MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    private Object parseHourly(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return HOURLY_MAPPER.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<java.util.Map<String, Object>>>() {});
        } catch (Exception e) {
            return null;
        }
    }
}
