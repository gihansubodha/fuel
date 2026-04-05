package com.fuel.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class WhatsAppService {

    private final WebClient webClient;

    @Value("${whatsapp.access-token}")
    private String accessToken;

    @Value("${whatsapp.phone-number-id}")
    private String phoneNumberId;

    public WhatsAppService(WebClient.Builder builder) {
        this.webClient = builder.baseUrl("https://graph.facebook.com").build();
    }

    public void sendWelcomeButtons(String to) {
        Map<String, Object> payload = Map.of(
                "messaging_product", "whatsapp",
                "to", to,
                "type", "interactive",
                "interactive", Map.of(
                        "type", "button",
                        "body", Map.of("text", "What are you looking for?"),
                        "action", Map.of(
                                "buttons", List.of(
                                        Map.of(
                                                "type", "reply",
                                                "reply", Map.of("id", "find_petrol", "title", "Find Petrol")
                                        ),
                                        Map.of(
                                                "type", "reply",
                                                "reply", Map.of("id", "find_diesel", "title", "Find Diesel")
                                        )
                                )
                        )
                )
        );

        postMessage(payload);
    }

    public void sendAskCityMessage(String to, String fuelType) {
        Map<String, Object> payload = Map.of(
                "messaging_product", "whatsapp",
                "to", to,
                "type", "text",
                "text", Map.of("body", "Which city should I search for " + fuelType + "?")
        );

        postMessage(payload);
    }

    public void sendOpenAppButton(String to, String city, String fuelType, String baseUrl) {
        String url = baseUrl + "/?city=" + city + "&fuel=" + fuelType;

        Map<String, Object> payload = Map.of(
                "messaging_product", "whatsapp",
                "to", to,
                "type", "interactive",
                "interactive", Map.of(
                        "type", "cta_url",
                        "body", Map.of("text", "Open the app to view " + fuelType + " stations in " + city + "."),
                        "action", Map.of(
                                "name", "cta_url",
                                "parameters", Map.of(
                                        "display_text", "Open Fuel Results",
                                        "url", url
                                )
                        )
                )
        );

        postMessage(payload);
    }

    private void postMessage(Map<String, Object> payload) {
        webClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/v23.0/{phoneNumberId}/messages")
                        .build(phoneNumberId))
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(String.class)
                .block();
    }
}