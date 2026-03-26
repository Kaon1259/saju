package com.saju.server.repository;

import com.saju.server.entity.MbtiFortune;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MbtiFortuneRepository extends JpaRepository<MbtiFortune, Long> {
    Optional<MbtiFortune> findByMbtiTypeAndZodiacAnimalAndFortuneDate(String mbtiType, String zodiacAnimal, LocalDate date);
    List<MbtiFortune> findByFortuneDate(LocalDate date);
}
