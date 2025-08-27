document.addEventListener("DOMContentLoaded", loadLocations);
const saveBtn = document.getElementById("save-btn");
saveBtn.addEventListener("click", saveLocation);

// Haversine formula for distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c; // meters
}

function saveLocation() {
  let label = document.getElementById("label").value.trim();
  if(!label) label = "Unnamed Location";

  if(!navigator.geolocation) { alert("Geolocation not supported"); return; }

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    const location = {
      label, lat, lng,
      timestamp: new Date().toLocaleString(),
      pinned: false
    };

    let locations = JSON.parse(localStorage.getItem("locations")) || [];
    locations.push(location);
    localStorage.setItem("locations", JSON.stringify(locations));

    document.getElementById("label").value = "";
    loadLocations();
  });
}

function loadLocations() {
  const container = document.getElementById("locations");
  container.innerHTML = "";
  let locations = JSON.parse(localStorage.getItem("locations")) || [];

  // Search filter
  const searchVal = document.getElementById("search")?.value.toLowerCase() || "";
  if(searchVal) {
    locations = locations.filter(l => l.label.toLowerCase().includes(searchVal));
  }

  // Sort
  const sortVal = document.getElementById("sort")?.value || "newest";
  if(sortVal === "newest") locations.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  else if(sortVal === "oldest") locations.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  else if(sortVal === "label") locations.sort((a,b)=>a.label.localeCompare(b.label));

  // Current location for distance
  navigator.geolocation.getCurrentPosition(pos => {
    const currLat = pos.coords.latitude;
    const currLng = pos.coords.longitude;

    locations.forEach((loc, index) => {
      const div = document.createElement("div");
      div.className = "card";
      const distance = getDistance(currLat, currLng, loc.lat, loc.lng);
      div.innerHTML = `
        <strong>${loc.label}${loc.pinned ? " ⭐" : ""}</strong>
        <p>📅 ${loc.timestamp}</p>
        <p>🌍 (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}) - ${distance < 1000 ? distance.toFixed(0)+" m" : (distance/1000).toFixed(2)+" km"}</p>
        <div class="map-container" id="map-${index}"></div>
        <button onclick="togglePin(${index})">${loc.pinned ? "Unpin" : "Pin"}</button>
        <button onclick="shareLocation(${index})">Share</button>
        <button onclick="deleteLocation(${index})">Delete</button>
      `;
      container.appendChild(div);

      // Initialize Leaflet map
      const map = L.map(`map-${index}`, {zoomControl:false, attributionControl:false}).setView([loc.lat, loc.lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      L.marker([loc.lat, loc.lng]).addTo(map);
    });
  });
}

function togglePin(index) {
  let locations = JSON.parse(localStorage.getItem("locations")) || [];
  locations[index].pinned = !locations[index].pinned;
  localStorage.setItem("locations", JSON.stringify(locations));
  loadLocations();
}

function shareLocation(index) {
  let locations = JSON.parse(localStorage.getItem("locations")) || [];
  const loc = locations[index];
  const url = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
  navigator.clipboard.writeText(url).then(()=> alert("Link copied!"));
}

function deleteLocation(index) {
  let locations = JSON.parse(localStorage.getItem("locations")) || [];
  locations.splice(index,1);
  localStorage.setItem("locations", JSON.stringify(locations));
  loadLocations();
}

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker Registered"));
}
