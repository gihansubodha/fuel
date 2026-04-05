package com.fuel.service;

import com.fuel.dto.CreateStationRequest;
import com.fuel.dto.StationSearchResponse;
import com.fuel.entity.FuelReport;
import com.fuel.entity.FuelType;
import com.fuel.entity.Station;
import com.fuel.repository.FuelReportRepository;
import com.fuel.repository.StationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class StationService {

    private final StationRepository stationRepository;
    private final FuelReportRepository fuelReportRepository;

    public StationService(StationRepository stationRepository,
                          FuelReportRepository fuelReportRepository) {
        this.stationRepository = stationRepository;
        this.fuelReportRepository = fuelReportRepository;
    }

    public Station create(CreateStationRequest request) {
        Station station = Station.builder()
                .name(request.getName())
                .city(request.getCity())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .address(request.getAddress())
                .brand(request.getBrand())
                .build();

        return stationRepository.save(station);
    }

    public List<Station> getByCity(String city) {
        return stationRepository.findByCityIgnoreCase(city);
    }

    public List<Station> getAll() {
        return stationRepository.findAll();
    }

    public Station getById(Long id) {
        return stationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Station not found"));
    }

    public List<StationSearchResponse> searchWithLatestStatuses(String city) {
        List<Station> stations;

        if (city != null && !city.isBlank()) {
            stations = stationRepository.findByCityIgnoreCase(city);
        } else {
            stations = stationRepository.findAll();
        }

        return stations.stream()
                .map(this::mapToSearchResponse)
                .toList();
    }

    private StationSearchResponse mapToSearchResponse(Station station) {
        Optional<FuelReport> latestPetrol =
                fuelReportRepository.findTopByStationIdAndFuelTypeOrderByReportedAtDesc(
                        station.getId(), FuelType.PETROL);

        Optional<FuelReport> latestDiesel =
                fuelReportRepository.findTopByStationIdAndFuelTypeOrderByReportedAtDesc(
                        station.getId(), FuelType.DIESEL);

        return StationSearchResponse.builder()
                .id(station.getId())
                .name(station.getName())
                .city(station.getCity())
                .latitude(station.getLatitude())
                .longitude(station.getLongitude())
                .latestPetrolStatus(latestPetrol.map(FuelReport::getStatus).orElse(null))
                .latestPetrolUpdatedAt(latestPetrol.map(FuelReport::getReportedAt).orElse(null))
                .latestDieselStatus(latestDiesel.map(FuelReport::getStatus).orElse(null))
                .latestDieselUpdatedAt(latestDiesel.map(FuelReport::getReportedAt).orElse(null))
                .build();
    }
}