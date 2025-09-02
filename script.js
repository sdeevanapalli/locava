let db;
let latestCoords = null;
const saveBtn = document.getElementById("save-btn");
let currentPage = 0;
const pageSize = 10;


// ---------- DISABLE SAVE INITIALLY ----------
saveBtn.disabled = true;
saveBtn.textContent = "Waiting for location...";

// ---------- LOCATION PERMISSION & GEOLOGICAL WATCH ----------
async function requestLocationPermission() {
    if (!navigator.permissions) return startGeolocation(); // fallback

    try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'granted' || status.state === 'prompt') {
            startGeolocation();
        } else {
            alert("Please enable location permission in your browser settings.");
            enableSaveButton();
        }
    } catch {
        startGeolocation(); // fallback
    }
}

function startGeolocation() {
    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        enableSaveButton();
        return;
    }

    // High-accuracy watch
    navigator.geolocation.watchPosition(
        pos => {
            latestCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            enableSaveButton();
        },
        err => {
            console.warn("High-accuracy failed, retrying with low accuracy:", err);
            navigator.geolocation.getCurrentPosition(
                pos => {
                    latestCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    enableSaveButton();
                },
                err => console.warn("Low-accuracy failed:", err),
                { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
            );
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    // Safety fallback: enable Save button after 15s
    setTimeout(enableSaveButton, 15000);
}

function enableSaveButton() {
    if (saveBtn.disabled) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Location";
    }
}

// ---------- CALL PERMISSION CHECK ON APP START ----------
requestLocationPermission();

// ---------- INDEXEDDB SETUP ----------
const request = indexedDB.open("locavaDB", 1);
request.onerror = e => console.log("DB error", e);
request.onsuccess = e => {
    db = e.target.result;
    loadLocations();
};
request.onupgradeneeded = e => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("locations")) {
        const store = db.createObjectStore("locations", { keyPath: "id", autoIncrement: true });
        store.createIndex("label", "label", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
    }
};

// ---------- SAVE LOCATION ----------
document.getElementById("save-btn").addEventListener("click", saveLocation);

function saveLocation() {
    if (!latestCoords) {
        alert("Waiting for location... Try again in a second.");
        return;
    }

    let label = document.getElementById("label").value.trim();
    if (!label) label = "Unnamed Location";

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const transaction = db.transaction(["locations"], "readwrite");
    const store = transaction.objectStore("locations");

    const locationObj = {
        label,
        lat: latestCoords.lat,
        lng: latestCoords.lng,
        timestamp: new Date().toISOString(),
        pinned: false
    };

    const addReq = store.add(locationObj);
    addReq.onsuccess = e => {
        document.getElementById("label").value = "";
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Location";

        locationObj.id = e.target.result;
        prependLocation(locationObj);
    };
}

// ---------- CREATE / APPEND LOCATION CARDS ----------
function createCard(loc) {
    const div = document.createElement("div");
    div.className = "card" + (loc.pinned ? " pinned" : "");
    const displayTime = new Date(loc.timestamp).toLocaleString();

    div.innerHTML = `
        <strong>${loc.label}${loc.pinned ? " ⭐" : ""}</strong>
        <p>📅 ${displayTime}</p>
        <p>🌍 (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})</p>
        <button onclick="togglePin(${loc.id})">${loc.pinned ? "Unpin" : "Pin"}</button>
        <button onclick="shareLocation(${loc.id})">Share</button>
        <button onclick="deleteLocation(${loc.id})">Delete</button>
        <button onclick="showMap(${loc.id}, ${loc.lat}, ${loc.lng})">View Map</button>
        <button onclick="goToGMaps(${loc.lat}, ${loc.lng})">Go</button>
        <div class="map-container" id="map-${loc.id}" style="display:none;height:200px;"></div>
    `;
    return div;
}

function prependLocation(loc) {
    const container = document.getElementById("locations");
    const div = createCard(loc);
    container.prepend(div);
}

// ---------- SHOW MAP ON DEMAND ----------
// ---------- OPEN IN GOOGLE MAPS ----------
function goToGMaps(lat, lng) {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
}
function showMap(id, lat, lng){
    const container = document.getElementById(`map-${id}`);
    container.style.display = "block";
    if(!container.dataset.loaded){
        const map = L.map(`map-${id}`, { zoomControl:false, attributionControl:false }).setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        L.marker([lat, lng]).addTo(map);
        container.dataset.loaded = true;
    }
}

// ---------- LOAD LOCATIONS WITH PAGINATION ----------
function loadLocations(page = 0) {
    currentPage = page;
    const container = document.getElementById("locations");
    container.innerHTML = "";

    const transaction = db.transaction(["locations"], "readonly");
    const store = transaction.objectStore("locations");
    const requestAll = store.getAll();

    requestAll.onsuccess = () => {
        let locations = requestAll.result;

        // Search filter
        const searchVal = document.getElementById("search")?.value.toLowerCase() || "";
        if (searchVal) locations = locations.filter(l => l.label.toLowerCase().includes(searchVal));

        // Sort + pinned-first
        const sortVal = document.getElementById("sort")?.value || "newest";
        locations.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            if (sortVal === "newest") return new Date(b.timestamp) - new Date(a.timestamp);
            if (sortVal === "oldest") return new Date(a.timestamp) - new Date(b.timestamp);
            if (sortVal === "label") return a.label.localeCompare(b.label);
            return 0;
        });

        // Pagination
        const start = page * pageSize;
        const end = start + pageSize;
        const pageLocations = locations.slice(start, end);
        pageLocations.forEach(loc => container.appendChild(createCard(loc)));

        const nextBtn = document.getElementById("next-page");
        nextBtn.style.display = locations.length > end ? "block" : "none";
    };
}

document.getElementById("next-page").addEventListener("click", () => {
    loadLocations(currentPage + 1);
});

// ---------- PIN / UNPIN ----------
function togglePin(id) {
    const transaction = db.transaction(["locations"], "readwrite");
    const store = transaction.objectStore("locations");
    const req = store.get(id);
    req.onsuccess = () => {
        const loc = req.result;
        loc.pinned = !loc.pinned;
        store.put(loc);
        loadLocations(currentPage);
    };
}

// ---------- SHARE ----------
function shareLocation(id) {
    const transaction = db.transaction(["locations"], "readonly");
    const store = transaction.objectStore("locations");
    const req = store.get(id);
    req.onsuccess = () => {
        const loc = req.result;
        const url = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
        navigator.clipboard.writeText(url).then(() => alert("Link copied!"));
    };
}

// ---------- DELETE ----------
function deleteLocation(id) {
    const transaction = db.transaction(["locations"], "readwrite");
    const store = transaction.objectStore("locations");
    store.delete(id);
    transaction.oncomplete = () => loadLocations(currentPage);
}

// ---------- SEARCH ----------
let searchTimeout;
document.getElementById("search").addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadLocations(0), 200);
});

// ---------- PWA SERVICE WORKER ----------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").then(() => {
    console.log("✅ Service Worker registered!");
  });
}
