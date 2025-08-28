let db;
let latestCoords = null;
const saveBtn = document.getElementById("save-btn");

// ---------- START APP ----------
// Disable save button initially
saveBtn.disabled = true;
saveBtn.textContent = "Waiting for location...";

// Start background geolocation watch
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        pos => {
            latestCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

            // Enable save button 1.5s after first valid location
            if (saveBtn.disabled) {
                setTimeout(() => {
                    saveBtn.disabled = false;
                    saveBtn.textContent = "Save Location";
                }, 1500);
            }
        },
        err => console.warn("Background geolocation error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
} else {
    alert("Geolocation not supported");
}

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
        appendLocation(locationObj);
    };
}

// ---------- APPEND NEW LOCATION ----------
function appendLocation(loc) {
    const container = document.getElementById("locations");
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
    `;

    container.prepend(div); // newest first
}

// ---------- LOAD LOCATIONS ----------
function loadLocations() {
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

        locations.forEach(loc => appendLocation(loc));
    };
}

// ---------- PIN / UNPIN ----------
function togglePin(id) {
    const transaction = db.transaction(["locations"], "readwrite");
    const store = transaction.objectStore("locations");
    const req = store.get(id);

    req.onsuccess = () => {
        const loc = req.result;
        loc.pinned = !loc.pinned;
        store.put(loc);
        loadLocations();
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
    transaction.oncomplete = () => loadLocations();
}

// ---------- SEARCH INPUT ----------
let searchTimeout;
document.getElementById("search").addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadLocations, 200); // debounce for speed
});

// ---------- PWA SERVICE WORKER ----------
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js")
        .then(() => console.log("Service Worker Registered"));
}
