package com.fuel.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WhatsAppSessionService {

    private final Map<String, String> userFuelPreference = new ConcurrentHashMap<>();

    public void setFuelPreference(String phoneNumber, String fuelType) {
        userFuelPreference.put(phoneNumber, fuelType);
    }

    public String getFuelPreference(String phoneNumber) {
        return userFuelPreference.get(phoneNumber);
    }

    public void clearFuelPreference(String phoneNumber) {
        userFuelPreference.remove(phoneNumber);
    }
}