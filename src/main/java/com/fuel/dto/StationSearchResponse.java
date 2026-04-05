package com.fuel.dto;

import com.fuel.entity.FuelStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StationSearchResponse {

    private Long id;
    private String name;
    private String city;
    private Double latitude;
    private Double longitude;

    private FuelStatus latestPetrolStatus;
    private LocalDateTime latestPetrolUpdatedAt;

    private FuelStatus latestDieselStatus;
    private LocalDateTime latestDieselUpdatedAt;
}