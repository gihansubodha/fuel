package com.fuel.config;

import com.fuel.entity.Station;
import com.fuel.repository.StationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataLoader {

    @Bean
    CommandLineRunner loadStations(StationRepository stationRepository) {
        return args -> {
            if (stationRepository.count() == 0) {
                stationRepository.save(Station.builder()
                        .name("Ceypetco Pettah")
                        .city("Colombo")
                        .latitude(6.9360)
                        .longitude(79.8500)
                        .address("Pettah, Colombo")
                        .brand("Ceypetco")
                        .build());

                stationRepository.save(Station.builder()
                        .name("IOC Borella")
                        .city("Colombo")
                        .latitude(6.9147)
                        .longitude(79.8770)
                        .address("Borella, Colombo")
                        .brand("IOC")
                        .build());

                stationRepository.save(Station.builder()
                        .name("Ceypetco Kandy")
                        .city("Kandy")
                        .latitude(7.2906)
                        .longitude(80.6337)
                        .address("Kandy Town")
                        .brand("Ceypetco")
                        .build());
            }
        };
    }
}