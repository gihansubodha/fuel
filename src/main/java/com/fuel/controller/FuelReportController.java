package com.fuel.controller;

import com.fuel.dto.CreateFuelReportRequest;
import com.fuel.entity.FuelReport;
import com.fuel.service.FuelReportService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin
public class FuelReportController {

    private final FuelReportService fuelReportService;

    public FuelReportController(FuelReportService fuelReportService) {
        this.fuelReportService = fuelReportService;
    }

    @PostMapping
    public FuelReport create(@Valid @RequestBody CreateFuelReportRequest request) {
        return fuelReportService.create(request);
    }

    @GetMapping("/station/{stationId}")
    public List<FuelReport> getByStation(@PathVariable Long stationId) {
        return fuelReportService.getByStation(stationId);
    }
}