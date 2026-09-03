# CarSide

**Racing. Shows. Weekends.**

CarSide is a low-friction automotive weekend companion. Open it and you immediately see what's happening soon on four wheels: the next Formula 1 sessions converted to *your* local time, and the car shows, Cars & Coffee meets, track days and race nights near you — merged into one timeline for the weekend.

It is a fully static web app (React + TypeScript + Vite) deployed on GitHub Pages at **https://adavidss.github.io/CarSide/**. No backend, no accounts, no API keys.

---

## What it does

| Screen | Purpose |
| --- | --- |
| **Home** | *Your automotive weekend.* A **Next Up** hero (the nearest live or upcoming F1 session or local event, with a countdown), then a day-grouped timeline of everything through Sunday, then next weekend. Thursday–Sunday it says *This weekend*; Monday–Wednesday it says *Coming up*. |
| **F1** | Next Grand Prix with circuit outline, flag, length, laps, race-day forecast and countdown; the full weekend schedule (FP1–Race, sprint sessions when applicable) in your browser's time zone with a **watchability** rating (*Easy watch · Early start · Alarm clock territory · Late night · Absolutely brutal*); last race podium; drivers' and constructors' standings; the season calendar. |
| **Nearby** | Local automotive events within your radius, filterable by type (Cars & Coffee / Shows / Racing / Track) and range (this weekend / next weekend / 30 / 90 days). Each row shows date, time, distance, city, admission, setting and a compact forecast. |
| **Event detail** | Editorial hero, when/where, straight-line distance, forecast at event time, admission, description, source link, Directions (Apple/Google Maps), Add to Calendar (.ics), Save. |
| **Saved** | Your shortlist, split into upcoming and past. Stored on-device. |
| **Settings** | Location, search radius, **Avoid spoilers**, appearance (system / light / dark), cache reset, and a plain-language list of every data source. |

Other behaviours worth knowing:

- **Spoiler mode** hides race results *and* championship standings until you tap *Reveal*; reveals are remembered per round, so once you've watched a race the standings stay visible until the next one finishes. Schedules are never hidden.
- **Add to Calendar** generates `.ics` files entirely in the browser — one session, the full F1 weekend, or a local event.
- **Weather** appears only for events inside Open-Meteo's 16-day horizon and is hidden when unavailable. The verdict (*Good show weather · Rain possible · Rain likely · Hot one · Bundle up*) uses the peak rain chance across the event window.
- **Freshness** is visible: every network-backed block says *Updated 4 min ago*, *Offline copy … may be out of date*, or *Bundled schedule*.
- **Installable**: a web manifest and a small app-shell service worker make it a lightweight PWA; the shell loads offline and the last fetched data is served from localStorage.

---

## Local development

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173/CarSide/` (the `/CarSide/` base path is applied in dev too, so what you see matches production).

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally at http://localhost:4173/CarSide/
npm test           # vitest unit tests (dates, recurrence, dedupe, ics, timeline…)
npm run typecheck  # tsc only
npm run circuits   # regenerate src/data/circuits.json from the upstream GeoJSON
```

Requires Node 20.19+ (22 recommended).

---

## GitHub Pages deployment

Deployment is automated with GitHub Actions — see [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). On every push to `main` it installs, tests, builds, and publishes `dist/` with `actions/deploy-pages`.

The workflow enables Pages itself on its first run (`actions/configure-pages` with `enablement: true`), so pushing to `main` is all it takes. If your organisation restricts that, enable it once by hand: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Every push then deploys to `https://<user>.github.io/CarSide/`.

How the static-hosting constraints are handled:

- **Base path** — `vite.config.ts` sets `base: '/CarSide/'` so every asset, icon and manifest URL is rooted at the project sub-path. For a custom domain or root hosting, build with `VITE_BASE_PATH=/ npm run build`.
- **Routing** — `HashRouter` (`/#/f1`, `/#/nearby/…`) means refreshes and deep links never hit a 404 on Pages, which has no SPA rewrite rules.
- **Jekyll** — `public/.nojekyll` stops Pages from post-processing the build.
- **Service worker** — registered at `${BASE_URL}sw.js`, scoped to `/CarSide/`.

---

## Data sources (all browser-accessible, CORS-enabled, no secrets)

| Data | Source | Notes |
| --- | --- | --- |
| F1 schedule, session times, standings, results | [Jolpica F1 API](https://api.jolpi.ca/) (Ergast successor) | Cached 12 h (schedule) / 2 h (standings, results). A bundled snapshot of the current season (`src/data/f1-schedule-fallback.json`) is used only if the API is unreachable and nothing is cached; it is ignored once the season year changes. |
| Circuit outlines, lengths | [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (MIT) | Converted to compact SVG paths by `scripts/build-circuits.mjs`. |
| Weather | [Open-Meteo](https://open-meteo.com/) | Hourly, 16 days, batched per ~1 km grid cell, cached 1 h. |
| Geocoding | OpenStreetMap Nominatim → Open-Meteo geocoder (fallback); Zippopotam.us for 5-digit ZIPs | Results cached indefinitely per query. Reverse geocoding labels "Use my location". |
| Local events | Curated JSON (`src/data/events.json`) + optional remote JSON feeds | See below. |

CarSide is an independent fan project and is not affiliated with, endorsed by, or connected to Formula 1, the FIA, or Formula One Licensing B.V.

---

## How local event discovery works (and its limits)

There is **no key-free, CORS-enabled public API for car shows**. Eventbrite, Meetup, Ticketmaster, Facebook and the show-listing sites all require private credentials or block browser requests — and a static site cannot hide a secret. Rather than ship a brittle scraper or fake data, CarSide uses a provider architecture with an honest, hand-curated source:

```ts
// src/models/events.ts
interface EventProvider {
  id: string;
  name: string;
  getEvents(context: EventSearchContext): Promise<CarEvent[]>;
}
```

- `src/services/events/registry.ts` runs every provider with `Promise.allSettled`, so one failing source never blanks the list; failures are reported next to the results ("Sources" on the Nearby page).
- Results are normalised to `CarEvent`, de-duplicated (`dedupe.ts`: same day + matching title + within 3 miles; a dated entry beats an occurrence generated from a recurrence rule), distance-annotated with the Haversine formula, and filtered by radius.
- Providers shipped today:
  - **`curated`** — `src/data/events.json`, bundled at build time.
  - **`feed:<host>`** — the same JSON schema fetched at runtime from the feeds listed in `appConfig.eventFeeds`. CarSide ships with one: a GitHub Gist you can edit to publish events without redeploying (see [Adding events without redeploying](#adding-events-without-redeploying-gist-feed)).
- Adding a real API later means one new file under `src/services/events/providers/` and one line in the registry. The UI does not change.

**Limits to be clear about:** the list is only as complete as its curation; recurring meets follow the organiser's *usual* pattern and can be cancelled or moved (rows are marked *Recurring · confirm date*); distances are straight-line; race-night start times are shown as *TBA* when the track hasn't published them. Every listing links to its source so you can check before driving out.

### Adding or editing curated events

Edit `src/data/events.json` and push — the workflow redeploys. Every entry needs an `id`, `title`, `type`, `city`, coordinates, and either dated `start`/`end` **or** a `recurrence` rule.

Dated event:

```json
{
  "id": "wake-forest-charity-car-show-2026",
  "title": "Wake Forest Charity Car Show",
  "type": "car-show",
  "start": "2026-09-19T09:00:00-04:00",
  "end": "2026-09-19T15:00:00-04:00",
  "venue": "The Market of Wake Forest",
  "address": "12217 Capital Blvd, Wake Forest, NC 27587",
  "city": "Wake Forest",
  "region": "NC",
  "latitude": 35.98183,
  "longitude": -78.54077,
  "admission": "Spectators free",
  "setting": "outdoor",
  "description": "One or two factual sentences.",
  "url": "https://www.wakeforestcommunitypartners.org/events.html",
  "source": { "id": "wakeforestcommunitypartners", "name": "Wake Forest Community Partners (organizer)", "url": "https://…" },
  "verifiedOn": "2026-09-02"
}
```

Recurring meet (expanded client-side in the rule's time zone, so DST is handled):

```json
{
  "id": "cars-and-coffee-morrisville",
  "title": "Cars and Coffee Morrisville",
  "type": "cars-and-coffee",
  "recurrence": {
    "freq": "monthly",          // "monthly" | "weekly"
    "weekday": "SA",            // SU MO TU WE TH FR SA
    "ordinal": 1,               // monthly only: 1–5, or -1 for "last"
    "startTime": "08:00",
    "endTime": "11:00",
    "timezone": "America/New_York",
    "seasonStart": "2026-03-01",     // optional inclusive bounds
    "seasonEnd": "2026-11-30",
    "months": [3, 4, 5, 6, 7, 8, 9, 10, 11],  // optional
    "exceptions": ["2026-07-04"]     // optional dates to skip
  },
  "venue": "Imperial Center",
  "address": "5425 Page Road, Durham, NC 27703",
  "city": "Durham",
  "latitude": 35.87614,
  "longitude": -78.84891,
  "url": "https://www.carsandcoffeemorrisville.com/events"
}
```

Field notes:

- `type`: `cars-and-coffee · car-show · classic · exotic · jdm · european · concours · museum · autocross · track-day · motorsport · drag-racing · festival · meet · auction · other`
- `subtitle`: a second line (this month's theme, series name, venue caveat).
- `allDay: true` for multi-day, date-only events (use `start` at local midnight and `end` at 23:59:59 of the last day).
- `timeTbd: true` when the date is confirmed but the start time isn't published — the row shows *TBA* and sorts after timed items that day.
- `confirmWithOrganizer: true` adds a "confirm before heading out" nudge (recurring entries get it automatically).
- Coordinates: look them up on OpenStreetMap (Nominatim works well for street addresses and venue names). The app skips entries without coordinates because it can't place them.
- A dated entry with the same title on the same day as a recurring rule replaces that occurrence — that's how the themed Morrisville dates carry their own subtitle.
- Bump `"updated"` at the top of the file; it's shown on the Nearby page.

### Adding events without redeploying (Gist feed)

`appConfig.eventFeeds` points at a GitHub Gist — [carside-events.json](https://gist.github.com/Adavidss/26a1057481009287a63eb96bd44cc96d) — that uses the same schema as `src/data/events.json`. Edit the Gist, save, and the new entries show up in the app within about an hour (feeds are cached for 60 minutes and the Gist's raw URL always serves the latest revision). Entries that duplicate a bundled event (same title, same day, within 3 miles) are merged, so it is safe to list an event in both places. To use a different feed, change the entry in `src/config/appConfig.ts`; any host that sends CORS headers works, and raw GitHub URLs and Gists do.

---

## Changing defaults

Everything lives in [`src/config/appConfig.ts`](src/config/appConfig.ts):

```ts
defaultLocation: { label: 'Morrisville, NC 27560', latitude: 35.8235, longitude: -78.8256 },
defaultRadiusMiles: 50,
radiusOptions: [10, 25, 50, 75, 100, 150],
eventFeeds: [{ name: 'CarSide Gist feed', url: 'https://gist.githubusercontent.com/…/raw/carside-events.json' }],
f1: { season: 'current' },
```

Users override location and radius in the app; those settings, saved events, spoiler reveals and the theme are persisted in `localStorage` under `carside:*` keys.

---

## Project structure

```text
src/
  components/
    brand/        Logo (CSS/SVG mark)
    events/       Timeline, TimelineRow, EventActions, SaveButton, WeatherBadge
    f1/           NextGrandPrix, SessionList, StandingsTable, LastRace, SeasonList,
                  CircuitOutline, Countdown, Flag
    home/         NextUp hero
    layout/       AppShell, Header, BottomNav, Footer
    location/     LocationForm, LocationPanel (header popover), LocationLine
    ui/           SectionHeading, Segmented, Switch, StatusPill, Skeleton, Freshness
    icons/        Inline SVG icon set
  config/         appConfig.ts
  data/           events.json (curated), circuits.json (generated), f1-schedule-fallback.json
  hooks/          useSettings, useSaved, useLocationPanel, useResource, useNow, useF1,
                  useEvents, useWeather
  models/         CarEvent / EventProvider, F1 types, settings, weather, location
  pages/          Home, F1, Nearby, EventDetail, Saved, Settings, NotFound
  services/
    cache.ts      localStorage cache with TTL + stale fallback (loadWithCache)
    http.ts       fetchJson with timeout
    f1/           jolpica.ts (provider), normalize.ts, circuitMeta.ts, teamColors.ts, index.ts
    events/       registry.ts, dedupe.ts, recurrence.ts, providers/{curated,remoteFeed}.ts
    weather/      openMeteo.ts
    geocoding/    nominatim.ts, openMeteoGeocoder.ts, zippopotam.ts, index.ts
  styles/         tokens.css, base.css, components.css, pages.css
  utils/          dates, zonedTime, timeline (merge/NextUp), distance, ics, calendar,
                  watchability, maps, eventTypes, id
scripts/          build-circuits.mjs
public/           manifest.webmanifest, sw.js, icons/, .nojekyll
```

Data providers are isolated from the UI: pages talk to hooks, hooks talk to `services/`, and each external source sits behind its own module so it can be replaced.

---

## Visual design philosophy

CarSide is designed for someone who actually likes cars and might open it while standing at a Cars & Coffee. The reference points are a premium instrument cluster, a race timing screen, paddock graphics and a good automotive magazine — **not** a SaaS dashboard.

Concretely, the system in `src/styles/tokens.css` is:

- **Colour** — charcoal, warm off-white, neutral greys, and *one* accent: signal orange, used deliberately for the Next Up rule, live indicators, active navigation and primary actions. Light and dark modes are both designed, and dark mode reads like an automotive interface rather than "black plus neon".
- **Type** — Barlow Condensed for headings, session labels, timing figures and uppercase labels; Barlow for body copy. Countdown digits sit in fixed-width cells so they never jitter. Uppercase is reserved for small labels.
- **Shape** — 2–6 px corner radii, hairline rules, square indicators and a rocker-style switch. Larger rounding appears nowhere.
- **Layout** — information is separated by whitespace, rules, typography and alignment. Numbered section rules ("01 THIS WEEKEND"), a coordinate readout in the footer and simplified circuit outlines are the only motifs. Containers are used only when they earn their place (the location popover, the circuit "plate", notices).
- **Density** — mobile first with a compact bottom navigation; the desktop layout adds a sticky F1 rail rather than spreading the same content thinner.

**Future design work should preserve this restraint.** Please avoid oversized rounded cards, pill-shaped containers, pastel or purple gradients, glassmorphism, soft drop shadows, decorative blobs, emoji-driven UI, carbon-fibre/checkered-flag textures and other generic "AI dashboard" patterns. If a new screen starts to look like a fintech app, redesign it.

---

## Accessibility & performance notes

- Semantic landmarks, skip link, labelled controls, `aria-pressed`/`role="switch"` on toggles, `role="timer"` countdowns with readable labels, visible `:focus-visible` rings, 44 px touch targets in the mobile nav, and `prefers-reduced-motion` support.
- A ~100 KB gzipped main bundle (React + Router + Home and Nearby) with the F1, Saved, Settings and event-detail screens code-split and prefetched once the app is idle; self-hosted latin-subset fonts, no image assets, network calls batched and cached in `localStorage`, and a service worker for the app shell.

---

## Credits

Circuit outlines derived from [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) (MIT, © Tomislav Bacinger). F1 data via the community-run [Jolpica](https://github.com/jolpica/jolpica-f1) API. Weather by [Open-Meteo](https://open-meteo.com/). Geocoding © OpenStreetMap contributors. Fonts: Barlow and Barlow Condensed (SIL Open Font License) via Fontsource.
