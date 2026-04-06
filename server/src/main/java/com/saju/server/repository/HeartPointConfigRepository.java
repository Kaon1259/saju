package com.saju.server.repository;

import com.saju.server.entity.HeartPointConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HeartPointConfigRepository extends JpaRepository<HeartPointConfig, Long> {

    Optional<HeartPointConfig> findByAnalysisCategory(String analysisCategory);
}
