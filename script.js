let db;
const request = indexedDB.open("locavaDB", 1);

request.onerror = (e) => console.log("DB error", e);
request.onsuccess = (e) => {
    db = e.target.result;
    loadLocations();
};

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if(!db.objectStoreNames.contains("locations")){
        const store = db.createObjectStore("locations", { keyPath: "id", autoIncrement: true });
        store.createIndex("label", "label", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
    }
};

document.getElementById("save-btn").addEventListener("click", saveLocation);

function saveLocation(){
    let label = document.getElementById("label").value.trim();
    if(!label) label = "Unnamed Location";

    if(!navigator.geolocation){ alert("Geolocation not supported"); return; }

    navigator.geolocation.getCurrentPosition(pos => {
        const transaction = db.transaction(["locations"], "readwrite");
        const store = transaction.objectStore("locations");

        store.add({
            label,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: new Date().toISOString(), // ISO for proper sorting
            pinned: false
        });

        transaction.oncomplete = () => {
            document.getElementById("label").value = "";
            loadLocations();
        }
    });
}

// Distance helper
function getDistance(lat1, lon1, lat2, lon2){
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R*c;
}

// Load locations
function loadLocations(){
    const container = document.getElementById("locations");
    container.innerHTML = "";

    const transaction = db.transaction(["locations"], "readonly");
    const store = transaction.objectStore("locations");
    const requestAll = store.getAll();

    requestAll.onsuccess = async () => {
        let locations = requestAll.result;

        // Search filter
        const searchVal = document.getElementById("search")?.value.toLowerCase() || "";
        if(searchVal) locations = locations.filter(l=>l.label.toLowerCase().includes(searchVal));

        // Sort + pinned-first
        const sortVal = document.getElementById("sort")?.value || "newest";
        locations.sort((a,b)=>{
            if(a.pinned && !b.pinned) return -1;
            if(!a.pinned && b.pinned) return 1;

            if(sortVal==="newest") return new Date(b.timestamp) - new Date(a.timestamp);
            if(sortVal==="oldest") return new Date(a.timestamp) - new Date(b.timestamp);
            if(sortVal==="label") return a.label.localeCompare(b.label);
            return 0;
        });

        navigator.geolocation.getCurrentPosition(pos=>{
            const currLat = pos.coords.latitude;
            const currLng = pos.coords.longitude;

            locations.forEach((loc)=>{
                const div = document.createElement("div");
                div.className = "card" + (loc.pinned ? " pinned" : "");
                const distance = getDistance(currLat, currLng, loc.lat, loc.lng);
                const displayTime = new Date(loc.timestamp).toLocaleString();

                div.innerHTML = `
                    <strong>${loc.label}${loc.pinned ? " ⭐" : ""}</strong>
                    <p>📅 ${displayTime}</p>
                    <p>🌍 (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}) - ${distance < 1000 ? distance.toFixed(0)+" m" : (distance/1000).toFixed(2)+" km"}</p>
                    <div class="map-container" id="map-${loc.id}"></div>
                    <button onclick="togglePin(${loc.id})">${loc.pinned ? "Unpin" : "Pin"}</button>
                    <button onclick="shareLocation(${loc.id})">Share</button>
                    <button onclick="deleteLocation(${loc.id})">Delete</button>
                `;
                container.appendChild(div);

                // Leaflet map
                const map = L.map(`map-${loc.id}`, {zoomControl:false, attributionControl:false}).setView([loc.lat, loc.lng], 16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                L.marker([loc.lat, loc.lng]).addTo(map);
            });
        });
    }
}

// Pin/unpin
function togglePin(id){
    const transaction = db.transaction(["locations"], "readwrite");
    const store = transaction.objectStore("locations");
    const req = store.get(id);
    req.onsuccess = () => {
        const loc = req.result;
        loc.pinned = !loc.pinned;
        store.put(loc);
        loadLocations();
    }
}

// Share location
function shareLocation(id){
    const transaction = db.transaction(["locations"], "readonly");
    const store = transaction.objectStore("locations");
    const req = store.get(id);
    req.onsuccess = () => {
        const loc = req.result;
        const url = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
        navigator.clipboard.writeText(url).then(()=> alert("Link copied!"));
    }
}

// Delete location
function deleteLocation(id){
    const transaction = db.transaction(["locations"], "readwrite");
    const store = transaction.objectStore("locations");
    store.delete(id);
    transaction.oncomplete = () => loadLocations();
}

// PWA service worker
if("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js")
        .then(()=>console.log("Service Worker Registered"));
}
