# LENNON Command Center

LENNON (Linked Execution, Navigation, Notes, Operations, and Networks) is a single-page personal dashboard for daily command-center use.  
It combines productivity tools, live feeds, quick launch apps, and an inline multi-LLM query box in one browser view.

## What This Dashboard Does

- Shows live local date/time and a rotating motivational quote.
- Provides one-click launch buttons for common apps (Gmail, YouTube, Obsidian, Facebook, Phone Link).
- Attempts unread notification badges for Gmail/Facebook using the current signed-in browser session.
- Displays current weather for Palo Alto, Calamba via Open-Meteo.
- Tracks walking activity with live GPS route drawing on a Leaflet/OpenStreetMap map, including duration, step estimate, and distance.
- Persists route/activity state locally and supports route reset.
- Pulls NBA live scoreboard and East/West standings from ESPN.
- Loads headline feeds for local news (GMA Network), international news (BBC World), and AI updates (VentureBeat AI).
- Includes an AI Query Box where you can select a provider and ask prompts directly from the dashboard (ChatGPT `gpt-4o-mini`, Gemini `gemini-2.0-flash-lite`, Grok `grok-2-mini`, Claude `claude-3-haiku-20240307`).
- Saves notes, to-dos, and custom links in `localStorage`.
- Shows a system snapshot (online status, platform, language, cores, memory, viewport).

## Tech Stack

- Plain HTML, CSS, and JavaScript (no build step).
- Leaflet for map rendering.
- Browser `fetch` + public APIs/RSS feeds.
- `localStorage` for persistence.

## Run Locally

1. Open `index.html` in a modern browser.
2. For best results, use a browser profile where you are already signed in to services like Gmail/Facebook.
3. Grant geolocation permission if you want walk/route tracking.

Optional local server (recommended for consistent behavior):

```powershell
cd "C:\Users\Loisky03\Lennon Command Center"
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Data + Storage Notes

- Dashboard state is stored in browser `localStorage` using keys like `lennon_notes`, `lennon_todos`, `lennon_links`, `lennon_walk`, `lennon_quote_cache`, and `lennon_llm_api_keys`.
- API keys entered in the AI Query Box are stored locally in that browser profile.
- External feeds/APIs can fail due to internet issues, CORS/proxy restrictions, or provider changes.

## Customization

- Update default location/timezone in `script.js` under `LOCATION`.
- Change refresh intervals using `REFRESH_MS` (feeds/score/weather/news/notifications) and `QUOTE_REFRESH_MS` (quote updates).
- Modify quick app buttons in `index.html` (`data-url` values).
- Adjust visuals in `styles.css`.

## Reminder
Always save all changes made every session. Update all files.
