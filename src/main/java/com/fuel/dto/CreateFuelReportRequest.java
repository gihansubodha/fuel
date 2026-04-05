package com.fuel.dto;

import com.fuel.entity.FuelStatus;
import com.fuel.entity.FuelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateFuelReportRequest {

    @NotNull
    private Long stationId;

    @NotNull
    private FuelType fuelType;

    @NotNull
    private FuelStatus status;

    @NotBlank
    private String reportedBy;
}