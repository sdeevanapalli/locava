
# Locava

Locava is a Progressive Web App (PWA) for saving, organizing, and sharing your favorite locations. It works offline, is installable, and features a modern, mobile-friendly UI.

## Features
- Save your current location with a custom label
- Pin/unpin important locations
- Search and sort saved locations (newest, oldest, label)
- Pagination for large lists
- Share locations via Google Maps link
- View locations on an embedded map (Leaflet)
- Delete locations
- Data stored locally using IndexedDB for privacy and persistence
- Offline support via service worker
- Installable on mobile and desktop

## Getting Started
1. Clone or download this repository.
2. Open `index.html` in your browser.
3. For the best experience, add Locava to your home screen (PWA install prompt).

## Deployment
Locava is deployed at https://locava.vercel.app

## File Overview
- `index.html`: Main app UI
- `script.js`: App logic (location saving, search, sort, pin, share, map, pagination)
- `style.css`: Styles
- `manifest.json`: PWA manifest
- `service-worker.js`: Offline support
- `vercel.json`: Vercel deployment config

## Tech Stack
- HTML, CSS, JavaScript
- IndexedDB (local storage)
- Leaflet.js (maps)
- Service Worker (offline/PWA)

