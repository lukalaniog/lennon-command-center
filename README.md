# Lennon Command Center

Lennon Command Center is a browser-based personal dashboard that combines daily tools in one place: live weather, map and route tracking, NBA updates, multi-source news, quick links, notes/todos, and an AI query panel.

## Features

- Weather snapshot and location-aware map routing.
- NBA live scoreboard and conference standings.
- News feeds for local, international, and AI topics.
- AI Query Box with selectable providers.
- Notes, to-do items, and custom links saved in browser `localStorage`.
- System snapshot panel (network, platform, language, cores, memory, viewport).

## Tech Stack

- HTML, CSS, and vanilla JavaScript.
- Leaflet for map rendering.
- Browser `fetch` with public APIs and RSS feeds.
- `localStorage` for client-side persistence.

## Project Structure

- `index.html` - Main dashboard layout and UI sections.
- `styles.css` - Styling, layout, and responsive behavior.
- `script.js` - App logic, integrations, state handling, and refresh loops.
- `LCC.md` - Extended project notes and customization references.

## Run Locally

1. Open `index.html` directly in a modern browser.
2. Grant geolocation permission for routing features.

Recommended local server:

```powershell
cd "C:\Users\Loisky03\Lennon Command Center"
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Configuration

- Update default location/timezone in `script.js` (`LOCATION`).
- Adjust feed refresh timing in `script.js` (`REFRESH_MS`, `QUOTE_REFRESH_MS`).
- Edit quick app links in `index.html` via `data-url` attributes.

## Notes

- Some external feeds may fail due to API/provider changes, connectivity, or CORS restrictions.
- API keys entered in the AI Query Box are stored locally in the current browser profile.

## Reminder

Always save all changes made every session. Update all files.