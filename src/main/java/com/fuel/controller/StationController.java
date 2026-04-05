package com.fuel.controller;

import com.fuel.dto.CreateStationRequest;
import com.fuel.dto.StationSearchResponse;
import com.fuel.entity.Station;
import com.fuel.service.StationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stations")
@CrossOrigin
public class StationController {

    private final StationService stationService;

    public StationController(StationService stationService) {
        this.stationService = stationService;
    }

    @PostMapping
    public Station create(@Valid @RequestBody CreateStationRequest request) {
        return stationService.create(request);
    }

    @GetMapping
    public List<StationSearchResponse> getAll(@RequestParam(required = false) String city) {
        return stationService.searchWithLatestStatuses(city);
    }
}