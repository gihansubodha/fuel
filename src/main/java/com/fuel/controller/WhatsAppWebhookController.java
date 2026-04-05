package com.fuel.controller;

import com.fuel.service.WhatsAppService;
import com.fuel.service.WhatsAppSessionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/webhook/whatsapp")
public class WhatsAppWebhookController {

    private final WhatsAppService whatsAppService;
    private final WhatsAppSessionService sessionService;

    @Value("${whatsapp.verify-token}")
    private String verifyToken;

    @Value("${app.public-base-url}")
    private String publicBaseUrl;

    public WhatsAppWebhookController(WhatsAppService whatsAppService,
                                     WhatsAppSessionService sessionService) {
        this.whatsAppService = whatsAppService;
        this.sessionService = sessionService;
    }

    @GetMapping
    public ResponseEntity<String> verifyWebhook(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String token,
            @RequestParam(name = "hub.challenge", required = false) String challenge
    ) {
        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            return ResponseEntity.ok(challenge);
        }
        return ResponseEntity.status(403).body("Verification failed");
    }

    @PostMapping
    public ResponseEntity<String> receiveMessage(@RequestBody Map<String, Object> payload) {
        try {
            List<Map<String, Object>> entries = (List<Map<String, Object>>) payload.get("entry");
            if (entries == null || entries.isEmpty()) {
                return ResponseEntity.ok("EVENT_RECEIVED");
            }

            Map<String, Object> entry = entries.get(0);
            List<Map<String, Object>> changes = (List<Map<String, Object>>) entry.get("changes");
            if (changes == null || changes.isEmpty()) {
                return ResponseEntity.ok("EVENT_RECEIVED");
            }

            Map<String, Object> change = changes.get(0);
            Map<String, Object> value = (Map<String, Object>) change.get("value");
            if (value == null) {
                return ResponseEntity.ok("EVENT_RECEIVED");
            }

            List<Map<String, Object>> messages = (List<Map<String, Object>>) value.get("messages");
            if (messages == null || messages.isEmpty()) {
                return ResponseEntity.ok("EVENT_RECEIVED");
            }

            Map<String, Object> message = messages.get(0);
            String from = (String) message.get("from");
            String type = (String) message.get("type");

            if ("interactive".equals(type)) {
                handleInteractiveMessage(from, message);
            } else if ("text".equals(type)) {
                handleTextMessage(from, message);
            }

            return ResponseEntity.ok("EVENT_RECEIVED");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok("EVENT_RECEIVED");
        }
    }

    private void handleInteractiveMessage(String from, Map<String, Object> message) {
        Map<String, Object> interactive = (Map<String, Object>) message.get("interactive");
        if (interactive == null) return;

        Map<String, Object> buttonReply = (Map<String, Object>) interactive.get("button_reply");
        if (buttonReply == null) return;

        String buttonId = (String) buttonReply.get("id");

        if ("find_petrol".equals(buttonId)) {
            sessionService.setFuelPreference(from, "PETROL");
            whatsAppService.sendAskCityMessage(from, "PETROL");
        } else if ("find_diesel".equals(buttonId)) {
            sessionService.setFuelPreference(from, "DIESEL");
            whatsAppService.sendAskCityMessage(from, "DIESEL");
        }
    }

    private void handleTextMessage(String from, Map<String, Object> message) {
        Map<String, Object> text = (Map<String, Object>) message.get("text");
        if (text == null) return;

        String body = (String) text.get("body");
        if (body == null || body.isBlank()) return;

        String fuelType = sessionService.getFuelPreference(from);

        if (fuelType == null) {
            whatsAppService.sendWelcomeButtons(from);
            return;
        }

        String city = body.trim();
        whatsAppService.sendOpenAppButton(from, city, fuelType, publicBaseUrl);
        sessionService.clearFuelPreference(from);
    }
}