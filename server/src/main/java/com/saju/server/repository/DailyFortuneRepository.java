package com.saju.server.repository;

import com.saju.server.entity.DailyFortune;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyFortuneRepository extends JpaRepository<DailyFortune, Long> {

    Optional<DailyFortune> findByZodiacAnimalAndFortuneDate(String zodiacAnimal, LocalDate fortuneDate);

    List<DailyFortune> findByFortuneDate(LocalDate fortuneDate);

    List<DailyFortune> findByZodiacAnimalAndFortuneDateBetweenOrderByFortuneDateAsc(
        String zodiacAnimal, LocalDate startDate, LocalDate endDate);
}
