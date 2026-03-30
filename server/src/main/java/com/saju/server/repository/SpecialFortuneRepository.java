package com.saju.server.repository;

import com.saju.server.entity.SpecialFortune;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface SpecialFortuneRepository extends JpaRepository<SpecialFortune, Long> {
    Optional<SpecialFortune> findByFortuneTypeAndCacheKeyAndFortuneDate(
        String fortuneType, String cacheKey, LocalDate fortuneDate);

    void deleteByFortuneTypeStartingWith(String prefix);
}
