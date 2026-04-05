package com.fuel.service;

import com.fuel.dto.CreateFuelReportRequest;
import com.fuel.entity.FuelReport;
import com.fuel.entity.Station;
import com.fuel.repository.FuelReportRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class FuelReportService {

    private final FuelReportRepository fuelReportRepository;
    private final StationService stationService;

    public FuelReportService(FuelReportRepository fuelReportRepository, StationService stationService) {
        this.fuelReportRepository = fuelReportRepository;
        this.stationService = stationService;
    }

    public FuelReport create(CreateFuelReportRequest request) {
        Station station = stationService.getById(request.getStationId());

        FuelReport report = FuelReport.builder()
                .station(station)
                .fuelType(request.getFuelType())
                .status(request.getStatus())
                .reportedBy(request.getReportedBy())
                .reportedAt(LocalDateTime.now())
                .build();

        return fuelReportRepository.save(report);
    }

    public List<FuelReport> getByStation(Long stationId) {
        return fuelReportRepository.findByStationIdOrderByReportedAtDesc(stationId);
    }
}