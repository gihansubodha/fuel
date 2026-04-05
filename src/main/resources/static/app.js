const resultsDiv = document.getElementById("results");
const searchBtn = document.getElementById("searchBtn");
const loadAllBtn = document.getElementById("loadAllBtn");
const useLocationBtn = document.getElementById("useLocationBtn");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const cityInput = document.getElementById("cityInput");
const messageEl = document.getElementById("message");
const reportedByInput = document.getElementById("reportedBy");

const petrolAvailableOnlyEl = document.getElementById("petrolAvailableOnly");
const dieselAvailableOnlyEl = document.getElementById("dieselAvailableOnly");
const anyFuelAvailableOnlyEl = document.getElementById("anyFuelAvailableOnly");
const freshnessFilterEl = document.getElementById("freshnessFilter");

let map;
let infoWindow;
let markers = [];
let mapReady = false;
let pendingStations = [];
let userMarker = null;
let userLocation = null;
let currentStations = [];
let displayedStations = [];

searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (!city) {
        messageEl.textContent = "Please enter a city name.";
        messageEl.style.color = "red";
        return;
    }
    updateUrlFromUi();
    fetchStations(city);
});

loadAllBtn.addEventListener("click", () => {
    cityInput.value = "";
    userLocation = null;
    clearUserMarker();
    updateUrlFromUi();
    fetchStations();
});

useLocationBtn.addEventListener("click", () => {
    locateUserAndShowNearby();
});

applyFiltersBtn.addEventListener("click", () => {
    updateUrlFromUi();
    applyCurrentView();
});

clearFiltersBtn.addEventListener("click", () => {
    petrolAvailableOnlyEl.checked = false;
    dieselAvailableOnlyEl.checked = false;
    anyFuelAvailableOnlyEl.checked = false;
    freshnessFilterEl.value = "";
    updateUrlFromUi();
    applyCurrentView();
});

window.initMap = async function () {
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");

    map = new Map(document.getElementById("map"), {
        center: { lat: 7.8731, lng: 80.7718 },
        zoom: 7,
        mapId: "DEMO_MAP_ID"
    });

    infoWindow = new InfoWindow();
    mapReady = true;

    if (pendingStations.length > 0) {
        renderMapMarkers(pendingStations, !!userLocation);
        pendingStations = [];
    }
};

async function submitReport(stationId, fuelType, status) {
    const reportedBy = reportedByInput.value.trim();

    if (!reportedBy) {
        messageEl.textContent = "Please enter your name before submitting a report.";
        messageEl.style.color = "red";
        return;
    }

    const payload = {
        stationId,
        fuelType,
        status,
        reportedBy
    };

    try {
        const response = await fetch("/api/reports", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error("Failed to submit report");
        }

        messageEl.textContent = `${fuelType} marked as ${status}.`;
        messageEl.style.color = "green";

        const city = cityInput.value.trim();
        if (city) {
            fetchStations(city);
        } else {
            fetchStations();
        }
    } catch (error) {
        messageEl.textContent = "Error submitting report.";
        messageEl.style.color = "red";
        console.error(error);
    }
}

async function fetchStations(city = "") {
    try {
        let url = "/api/stations";
        if (city) {
            url += `?city=${encodeURIComponent(city)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch stations");
        }

        const data = await response.json();
        currentStations = data;
        applyCurrentView();
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color:red;">Failed to load stations.</p>`;
        console.error(error);
    }
}

function applyCurrentView() {
    let working = [...currentStations];

    if (userLocation) {
        working = working
            .map(station => ({
                ...station,
                distanceKm: calculateDistanceKm(
                    userLocation.lat,
                    userLocation.lng,
                    Number(station.latitude),
                    Number(station.longitude)
                )
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    working = applyFilters(working);

    displayedStations = working;
    renderStations(displayedStations);

    if (mapReady) {
        renderMapMarkers(displayedStations, !!userLocation);
    } else {
        pendingStations = displayedStations;
    }
}

function applyFilters(stations) {
    let filtered = [...stations];

    if (petrolAvailableOnlyEl.checked) {
        filtered = filtered.filter(station => station.latestPetrolStatus === "AVAILABLE");
    }

    if (dieselAvailableOnlyEl.checked) {
        filtered = filtered.filter(station => station.latestDieselStatus === "AVAILABLE");
    }

    if (anyFuelAvailableOnlyEl.checked) {
        filtered = filtered.filter(station =>
            station.latestPetrolStatus === "AVAILABLE" ||
            station.latestDieselStatus === "AVAILABLE"
        );
    }

    const freshnessMinutes = freshnessFilterEl.value ? Number(freshnessFilterEl.value) : null;
    if (freshnessMinutes) {
        filtered = filtered.filter(station => {
            const petrolFresh = isWithinMinutes(station.latestPetrolUpdatedAt, freshnessMinutes);
            const dieselFresh = isWithinMinutes(station.latestDieselUpdatedAt, freshnessMinutes);
            return petrolFresh || dieselFresh;
        });
    }

    return filtered;
}

function locateUserAndShowNearby() {
    if (!navigator.geolocation) {
        messageEl.textContent = "Geolocation is not supported by this browser.";
        messageEl.style.color = "red";
        return;
    }

    messageEl.textContent = "Getting your location...";
    messageEl.style.color = "#075985";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            messageEl.textContent = "Location found. Showing nearby stations.";
            messageEl.style.color = "green";

            addOrUpdateUserMarker();
            applyCurrentView();
        },
        (error) => {
            messageEl.textContent = "Unable to access your location.";
            messageEl.style.color = "red";
            console.error(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

async function renderMapMarkers(stations, focusOnUser = false) {
    if (!map) return;

    clearMarkers();

    if (!stations || stations.length === 0) {
        return;
    }

    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const bounds = new google.maps.LatLngBounds();

    if (focusOnUser && userLocation) {
        bounds.extend(userLocation);
    }

    stations.forEach((station) => {
        const position = {
            lat: Number(station.latitude),
            lng: Number(station.longitude)
        };

        const markerElement = document.createElement("div");
        markerElement.className = `custom-marker ${getMarkerColorClass(station)}`;

        const marker = new AdvancedMarkerElement({
            map,
            position,
            title: station.name,
            content: markerElement
        });

        marker.addListener("click", () => {
            const distanceText = station.distanceKm != null
                ? `<div><strong>Distance:</strong> ${station.distanceKm.toFixed(2)} km</div>`
                : "";

            const petrolFreshness = getFreshnessText(station.latestPetrolUpdatedAt);
            const dieselFreshness = getFreshnessText(station.latestDieselUpdatedAt);

            const content = `
                <div style="min-width:220px">
                    <h3 style="margin:0 0 8px 0;">${station.name}</h3>
                    <div><strong>City:</strong> ${station.city}</div>
                    ${distanceText}
                    <div><strong>Petrol:</strong> ${station.latestPetrolStatus ?? "NO DATA"}</div>
                    <div><strong>Petrol Updated:</strong> ${petrolFreshness}</div>
                    <div><strong>Diesel:</strong> ${station.latestDieselStatus ?? "NO DATA"}</div>
                    <div><strong>Diesel Updated:</strong> ${dieselFreshness}</div>
                    <div style="margin-top:8px;">
                        <a href="https://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}" target="_blank">
                            Open in Google Maps
                        </a>
                    </div>
                </div>
            `;

            infoWindow.setContent(content);
            infoWindow.open({
                anchor: marker,
                map
            });
        });

        markers.push(marker);
        bounds.extend(position);
    });

    if (focusOnUser && userLocation) {
        map.setCenter(userLocation);
        map.setZoom(12);
    } else if (stations.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(13);
    } else {
        map.fitBounds(bounds);
    }
}

async function addOrUpdateUserMarker() {
    if (!map || !userLocation) return;

    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    clearUserMarker();

    const markerElement = document.createElement("div");
    markerElement.className = "custom-marker marker-gray";

    userMarker = new AdvancedMarkerElement({
        map,
        position: userLocation,
        title: "Your Location",
        content: markerElement
    });

    map.setCenter(userLocation);
    map.setZoom(12);
}

function clearMarkers() {
    markers.forEach(marker => {
        marker.map = null;
    });
    markers = [];
}

function clearUserMarker() {
    if (userMarker) {
        userMarker.map = null;
        userMarker = null;
    }
}

function renderStations(stations) {
    if (!stations || stations.length === 0) {
        resultsDiv.innerHTML = `<p>No stations found for the selected filters.</p>`;
        return;
    }

    resultsDiv.innerHTML = stations.map(station => {
        const distanceBadge = station.distanceKm != null
            ? `<div class="distance-badge">${station.distanceKm.toFixed(2)} km away</div>`
            : "";

        return `
        <div class="station-card">
            <h3>${station.name}</h3>
            <div class="station-meta">
                <div><strong>City:</strong> ${station.city}</div>
                <div><strong>Latitude:</strong> ${station.latitude}</div>
                <div><strong>Longitude:</strong> ${station.longitude}</div>
                ${distanceBadge}
            </div>

            <div class="status-grid">
                <div class="status-box">
                    <h4>Petrol</h4>
                    <div class="${getStatusClass(station.latestPetrolStatus)}">
                        ${station.latestPetrolStatus ?? "NO DATA"}
                    </div>
                    <div class="freshness-text">${getFreshnessText(station.latestPetrolUpdatedAt)}</div>
                </div>

                <div class="status-box">
                    <h4>Diesel</h4>
                    <div class="${getStatusClass(station.latestDieselStatus)}">
                        ${station.latestDieselStatus ?? "NO DATA"}
                    </div>
                    <div class="freshness-text">${getFreshnessText(station.latestDieselUpdatedAt)}</div>
                </div>
            </div>

            <div class="report-actions">
                <button class="success" onclick="submitReport(${station.id}, 'PETROL', 'AVAILABLE')">Petrol Available</button>
                <button class="danger" onclick="submitReport(${station.id}, 'PETROL', 'UNAVAILABLE')">Petrol Unavailable</button>
                <button class="success" onclick="submitReport(${station.id}, 'DIESEL', 'AVAILABLE')">Diesel Available</button>
                <button class="danger" onclick="submitReport(${station.id}, 'DIESEL', 'UNAVAILABLE')">Diesel Unavailable</button>
                <button class="map-btn" onclick="openInGoogleMaps(${station.latitude}, ${station.longitude})">Open in Google Maps</button>
            </div>
        </div>
        `;
    }).join("");
}

function getStatusClass(status) {
    if (status === "AVAILABLE") return "available";
    if (status === "UNAVAILABLE") return "unavailable";
    return "unknown";
}

function getFreshnessText(value) {
    if (!value) return "No update yet";

    const updatedAt = new Date(value);
    const now = new Date();
    const diffMs = now - updatedAt;

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Updated just now";
    if (minutes < 60) return `Updated ${minutes} min ago`;
    if (hours < 24) return `Updated ${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `Updated ${days} day${days > 1 ? "s" : ""} ago`;
}

function getMarkerColorClass(station) {
    const petrol = station.latestPetrolStatus;
    const diesel = station.latestDieselStatus;

    if (petrol === "AVAILABLE" || diesel === "AVAILABLE") {
        return "marker-green";
    }

    if (
        (petrol === "UNAVAILABLE" || petrol == null) &&
        (diesel === "UNAVAILABLE" || diesel == null) &&
        (petrol === "UNAVAILABLE" || diesel === "UNAVAILABLE")
    ) {
        return "marker-red";
    }

    return "marker-gray";
}

function openInGoogleMaps(latitude, longitude) {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    window.open(url, "_blank");
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (value) => value * Math.PI / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
}

function isWithinMinutes(value, maxMinutes) {
    if (!value) return false;
    const updatedAt = new Date(value);
    const now = new Date();
    const diffMs = now - updatedAt;
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes <= maxMinutes;
}

function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);

    const city = params.get("city");
    const fuel = params.get("fuel");
    const freshness = params.get("freshness");

    if (city) {
        cityInput.value = city;
    }

    petrolAvailableOnlyEl.checked = false;
    dieselAvailableOnlyEl.checked = false;
    anyFuelAvailableOnlyEl.checked = false;

    if (fuel) {
        const normalizedFuel = fuel.toUpperCase();
        if (normalizedFuel === "PETROL") {
            petrolAvailableOnlyEl.checked = true;
        } else if (normalizedFuel === "DIESEL") {
            dieselAvailableOnlyEl.checked = true;
        } else if (normalizedFuel === "ANY") {
            anyFuelAvailableOnlyEl.checked = true;
        }
    }

    if (freshness) {
        freshnessFilterEl.value = freshness;
    }
}

function updateUrlFromUi() {
    const params = new URLSearchParams();

    const city = cityInput.value.trim();
    if (city) {
        params.set("city", city);
    }

    if (petrolAvailableOnlyEl.checked) {
        params.set("fuel", "PETROL");
    } else if (dieselAvailableOnlyEl.checked) {
        params.set("fuel", "DIESEL");
    } else if (anyFuelAvailableOnlyEl.checked) {
        params.set("fuel", "ANY");
    }

    const freshness = freshnessFilterEl.value;
    if (freshness) {
        params.set("freshness", freshness);
    }

    const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

    window.history.replaceState({}, "", newUrl);
}

function bootFromUrl() {
    applyUrlParams();

    const city = cityInput.value.trim();
    if (city) {
        fetchStations(city);
    } else {
        fetchStations();
    }
}

bootFromUrl();