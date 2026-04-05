package com.fuel.repository;

import com.fuel.entity.FuelReport;
import com.fuel.entity.FuelType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FuelReportRepository extends JpaRepository<FuelReport, Long> {

    List<FuelReport> findByStationIdOrderByReportedAtDesc(Long stationId);

    Optional<FuelReport> findTopByStationIdAndFuelTypeOrderByReportedAtDesc(Long stationId, FuelType fuelType);
}