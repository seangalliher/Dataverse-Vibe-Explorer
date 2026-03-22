# Dataverse Vibe Explorer

**Enter the Dataverse** — a 3D immersive explorer for Microsoft Dataverse environments, inspired by SGI's FSN (File System Navigator) featured in *Jurassic Park*.

> *"It's a UNIX system! I know this!"* — but for Dataverse.

![Power Apps Code App](https://img.shields.io/badge/Power%20Apps-Code%20App-742774?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square)
![Three.js](https://img.shields.io/badge/Three.js-r172-000000?style=flat-square)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

<img width="1269" height="696" alt="Entry view" src="https://github.com/user-attachments/assets/8f1db404-b54c-4bee-914c-b20fea490834" />


## What Is This?

Dataverse Vibe Explorer renders your Dataverse environment as a navigable 3D cityscape. Tables become glowing platforms, columns rise as pillars, and relationships arc between them as laser beams — all in a neon-noir aesthetic with bloom, particles, and cinematic camera controls.

It connects to **live Dataverse metadata** when deployed as a Power Apps Code App, discovering real tables, columns, relationships, and apps from your environment. In local dev mode, it renders a rich mock dataset for development and demos.



### Key Features

- **3D Table Visualization** — Each Dataverse table is a floating platform with column pillars. Platform size reflects record count; pillar height reflects field importance.
- **CDM Domain Grouping** — Tables are spatially organized by Common Data Model domains (Core, Sales, Service, Marketing, Finance, Custom) with color-coded regions.
- **Relationship Beams** — One-to-many and many-to-many relationships rendered as glowing beams connecting tables.
- **Fly-Through Navigation** — WASD + mouse controls for free-flight exploration. Shift to boost, Space to ascend.
- **Live Metadata & Data Access** — 97 registered tables with full CRUD bridge access. Real record counts via `retrieveMultipleRecordsAsync`. Table metadata via `getEntityMetadata` for all tables.
- **AI Agent with Voice** — Conversational Dataverse guide with navigate, describe, and tour commands. Voice input via Web Speech API and text-to-speech responses via Edge neural voices.
- **Table Descriptions** — Short descriptions and Microsoft Learn search links for ~100 standard Dataverse tables.
- **3-Tier Caching** — Session storage (instant soft-refresh) → Dataverse cache table (cross-session) → fresh fetch (first-time).
- **Minimap** — Overhead 2D minimap with per-table tooltips and click-to-fly navigation.
- **Table Inspector** — Click any table to see record count, domain, description, and a Microsoft Learn link.
- **Record Preview** — View real records from any registered table with system view selection.
- **Search** — Quick search to find and fly to any table by name.
- **Table Browser** — Sidebar panel for browsing, filtering, and sorting all discovered tables.
- **App Portals** — Model-driven and canvas apps rendered as glowing gateway arches grouped by solution.
- **Post-Processing** — Bloom, vignette, and chromatic aberration for cinematic atmosphere.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Engine | [Three.js](https://threejs.org/) via [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) |
| Framework | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) |
| Effects | [@react-three/postprocessing](https://docs.pmnd.rs/react-postprocessing) (Bloom, Vignette, ChromaticAberration) |
| Platform | [Power Apps Code Apps](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/overview) |
| SDK | [@microsoft/power-apps](https://www.npmjs.com/package/@microsoft/power-apps) |
| Build | [Vite](https://vitejs.dev/) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Power Platform CLI](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction) (`pac`) for deployment
- A Power Apps environment (for live mode)

### Local Development

```bash
# Clone the repo
git clone https://github.com/seangalliher/Dataverse-Vibe-Explorer.git
cd Dataverse-Vibe-Explorer

# Install dependencies
npm install

# Start dev server (runs in mock/demo mode locally)
npm run dev
```

Open `http://localhost:5173` — the app runs with mock data showing 20 common Dataverse tables with realistic metadata.

### Deploy to Power Apps

```bash
# Build for production
npm run build

# Push to your Power Apps environment
pac code push
```

The app will be available in your Power Apps environment and automatically connects to live Dataverse metadata.

## Controls

| Input | Action |
|-------|--------|
| `W` / `A` / `S` / `D` | Move forward / left / backward / right |
| `Mouse` | Look around |
| `Shift` | Speed boost |
| `Space` | Fly up |
| `Click` (on table) | Select and inspect table |
| `Click` (on minimap dot) | Fly to table |
| `Tab` | Toggle AI chat panel |
| `/` | Focus search bar |
| Mic button | Voice commands (in chat panel) |

## Architecture

```
Dataverse API (via Power Apps SDK bridge)
    |
    v
Metadata Layer ──> getEntityMetadata + retrieveMultipleRecordsAsync
    |
    v
CDM Classifier ──> Maps tables to spatial domains
    |
    v
Scene Graph ──> Computes 3D positions, sizes, relationships
    |
    v
React Three Fiber ──> Renders the 3D world
    |
    v
Interaction Layer ──> Navigation, selection, HUD, Voice I/O
```

### SDK Bridge Capabilities

The Power Apps Code Apps SDK bridge supports full CRUD operations for **registered tables** (97 tables registered in `power.config.json` and `dataSourcesInfo.ts`):

- **`retrieveMultipleRecordsAsync`** — Works for all registered tables. Uses entity set names (plural).
- **`retrieveRecordAsync`** — Works for all registered tables.
- **`createRecordAsync` / `updateRecordAsync` / `deleteRecordAsync`** — Work for all registered tables.
- **`executeAsync` with `getEntityMetadata`** — Works for ALL tables (no registration needed), but `EntitySetName` and `PrimaryIdAttribute` are undefined in response.
- **`count: true` option** — Broken. Bridge rejects any query with `$count`.
- **Direct Web API** — Blocked by CORS inside the Code App iframe.

## Project Structure

```
src/
  main.tsx                  Entry point
  App.tsx                   Root component, Canvas + overlay setup
  scene/
    World.tsx               Main 3D scene composition & data loading
    Platform.tsx            Table platform with glow, label, selection
    Pillar.tsx              Column/field pillars on each platform
    RelationshipBeam.tsx    Animated beams between related tables
    AppPortal.tsx           App launcher gateway arches
    AgentAvatar.tsx         Holographic AI agent avatar
    GridFloor.tsx           Infinite grid ground plane
    Skybox.tsx              Gradient sky dome with stars
    ParticleField.tsx       Ambient floating data particles
    BreadcrumbTrail.tsx     Navigation history trail
    MaterializationEffect.tsx  Object materialization animation
  ui/
    HudOverlay.tsx          Controls hint + table inspection panel
    HoverTooltip.tsx        3D hover tooltip for tables
    Minimap.tsx             2D overhead minimap with tooltips
    SearchBar.tsx           Quick search with fly-to
    TableBrowser.tsx        Sidebar table list, filter, sort
    RecordPreviewPanel.tsx  Real record data viewer with view selection
    ChatPanel.tsx           AI agent chat with voice input/output
    SyncProgressBar.tsx     Discovery progress indicator
    LoadingScreen.tsx       Initial loading screen
    Toolbar.tsx             Settings (high contrast, reduce motion)
  data/
    dataverse.ts            SDK connector, metadata fetch, CRUD operations
    metadata.ts             Table/relationship/app metadata + mock data
    tableDescriptions.ts    Table descriptions + Learn links for ~100 tables
    cacheService.ts         Cache-first loading via dve_tablecache/dve_userpreference
    cdmClassifier.ts        CDM domain classification
    sceneGraph.ts           Spatial layout computation
  controls/
    FlyControls.tsx         WASD + mouse flight controls
    CameraManager.tsx       Smooth camera transitions
  store/
    appStore.ts             Zustand global state
  agent/
    agentService.ts         Agent commands: navigate, describe, tour, search
    vibeActions.ts          Vibe coding action handlers
  utils/
    tts.ts                  Text-to-speech via Web Speech API
    colors.ts               CDM domain color palette
    layout.ts               Grid layout algorithms
    easing.ts               Animation easing functions
```

## CDM Domain Color Map

| Domain | Color | Example Tables |
|--------|-------|---------------|
| Core | Cyan | Account, Contact, Activity, Note |
| Sales | Blue | Opportunity, Lead, Quote, Order, Invoice |
| Service | Green | Case, Knowledge Article, Entitlement |
| Marketing | Purple | Campaign, Marketing List |
| Finance | Amber | Product, Price List, Currency |
| System | Slate | User, Team, Business Unit, Role |
| Custom | Pink | Any custom (`cr_`, `new_`) tables |

## Configuration

`power.config.json` contains the Power Apps deployment target:

```json
{
  "appId": "your-app-id",
  "environmentId": "your-environment-id"
}
```

This file is auto-generated by `pac code init` and updated on deployment.

## Inspiration

- [FSN (File System Navigator)](https://en.wikipedia.org/wiki/Fsn_(file_manager)) — Silicon Graphics, IRIX (1993)
- [FSV (File System Visualizer)](http://fsv.sourceforge.net/) — Open source reimplementation
- *Jurassic Park* (1993) — "It's a UNIX system! I know this!"
- Tron Legacy (2010) — Neon-noir visual aesthetic

## License

[MIT](LICENSE) - Sean Galliher
