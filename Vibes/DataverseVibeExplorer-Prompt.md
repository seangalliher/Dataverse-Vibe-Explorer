# Dataverse Vibe Explorer — App Generation Prompt

## Project Overview

Build an application called **Dataverse Vibe Explorer** — an immersive 3D application that lets users navigate, explore, and interact with their Microsoft Dataverse environment as a three-dimensional world. The app must be deployable as a **Power Apps Code App**.

---

## Platform & Deployment Target

### Power Apps Code Apps
- The app is a **Single-Page Application (SPA)** built with **TypeScript**, **Vite**, and **React**.
- It uses the **@microsoft/power-apps** npm package (Power Apps client library for code apps) to access Power Platform connectors, Dataverse data, and authentication.
- The project is scaffolded from the official Vite template: `npx degit github:microsoft/PowerAppsCodeApps/templates/vite dataverse-vibe-explorer`
- Local development uses `npx power-apps init` and `npm run dev`. Deployment uses `npm run build && npx power-apps push`.
- The Power Apps host handles **Microsoft Entra authentication** and authorization — the app does not need to implement its own auth flow.
- Configuration lives in `power.config.json` (auto-generated).
- Reference: https://learn.microsoft.com/en-us/power-apps/developer/code-apps/overview
- Architecture: https://learn.microsoft.com/en-us/power-apps/developer/code-apps/architecture
- Quickstart: https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/npm-quickstart

### Key Constraints
- The app runs in a browser — no native code, no desktop-only APIs.
- Sensitive data must not be embedded in the app bundle; all data is fetched at runtime via Dataverse connectors after authentication.
- The Power Apps header can be hidden by appending `?hideNavBar=true` to the play URL.

---

## 3D Engine Selection: Three.js + React Three Fiber

### Why Three.js / React Three Fiber (R3F)
Three.js with React Three Fiber is the optimal choice for this project:

1. **React-native integration** — R3F is a React renderer for Three.js, meaning 3D scenes are declared as JSX components. This fits perfectly with Power Apps Code Apps which use React + Vite.
2. **No binary/WASM dependencies** — Unlike Babylon.js (which is also viable but heavier), R3F is pure JavaScript/TypeScript and integrates seamlessly into the Vite build pipeline without WebAssembly complications.
3. **Rich ecosystem** — `@react-three/drei` provides pre-built helpers (cameras, controls, text, effects, environment maps, postprocessing). `@react-three/postprocessing` adds bloom, depth-of-field, and other cinematic effects that make the FSN aesthetic come alive.
4. **Performance** — Three.js is the most battle-tested WebGL library. R3F adds zero overhead — it's a thin reconciler, not a wrapper. Instanced rendering, LOD, and frustum culling are all natively supported.
5. **Community & documentation** — Largest 3D-on-the-web community. Abundant examples, tutorials, and production case studies.
6. **Bundle size** — Tree-shakeable. Only import what you use. Critical for Power Apps Code Apps where the compiled bundle is published to the platform.

### Key npm Packages
```
@react-three/fiber        — React renderer for Three.js
@react-three/drei         — Helpers: OrbitControls, Text3D, Sky, Environment, Float, etc.
@react-three/postprocessing — Bloom, depth-of-field, vignette, god rays
three                     — Core 3D engine
zustand                   — Lightweight state management (recommended by R3F ecosystem)
leva                      — Debug GUI for tuning 3D parameters during development
@microsoft/power-apps     — Power Apps client library for Dataverse data access
```

---

## UX Design: Modern FSN (File System Navigator) from SGI IRIX

### Reference: The Original FSN
The File System Navigator (FSN, pronounced "fusion") was a 3D file manager developed by Silicon Graphics for IRIX. It was famously featured in the 1993 movie *Jurassic Park* ("It's a UNIX system! I know this!"). Key visual characteristics:

1. **3D Landscape of Columns** — The file system is represented as a 3D cityscape. Each directory is a raised platform/pedestal. Files within a directory are columns (rectangular prisms) rising from the platform, with height proportional to file size.
2. **Perspective Navigation** — The user flies through the landscape using a virtual camera. Navigation is smooth and cinematic — sweeping camera movements, zoom, pan, and fly-through.
3. **Hierarchical Depth** — Subdirectories are nested platforms extending from parent platforms, creating a terraced, tiered cityscape effect.
4. **Color Coding** — Different file types are represented by different column colors.
5. **Labels** — Directory and file names appear as floating 3D text labels on platforms and columns.
6. **Ambient Atmosphere** — The scene has a distinct ambient glow, dark background (space-like), with subtle grid lines on the ground plane.

### Modern Interpretation for Dataverse Vibe Explorer
Reimagine FSN for the Dataverse with these modern enhancements:

#### Visual Design Language
- **Neon-noir aesthetic**: Dark background with glowing neon edges on all geometry (bloom postprocessing). Think Tron Legacy meets FSN.
- **Glass/crystal materials**: Tables and entities rendered with physically-based glass/crystal shaders — translucent, refractive, with subtle internal glow.
- **Floating platforms**: Each Dataverse table is a floating hexagonal or circular platform hovering in 3D space, arranged by CDM schema groupings.
- **Particle systems**: Ambient floating particles (data motes) drift through the scene, denser near tables with more records.
- **Dynamic lighting**: Soft colored point lights under each platform. Color corresponds to the CDM domain (Sales = blue, Service = green, Marketing = purple, etc.).
- **Skybox**: A subtle deep-space environment with a gradient horizon — dark indigo to black — with faint nebula textures.

#### Navigation
- **Fly-through camera**: WASD + mouse or click-to-navigate. The user flies through the 3D space like a drone.
- **Orbit mode**: Click on any table/entity to orbit around it and inspect it.
- **Zoom transitions**: Smooth animated camera transitions when selecting a table — the camera sweeps cinematically from overview to close-up.
- **Minimap**: A 2D overhead minimap in the corner showing the user's position in the Dataverse landscape.
- **Breadcrumb trail**: A glowing path trail showing the user's navigation history.

#### Table Representation
- **Platform per table**: Each Dataverse table is a platform. The platform size is proportional to record count.
- **Column pillars**: Key columns/fields of a table are represented as pillars rising from the platform. Pillar height can represent data volume or field importance.
- **Relationship beams**: Relationships between tables are visualized as glowing laser-beam lines connecting platforms. One-to-many relationships use branching beams. Many-to-many use crossing arcs.
- **Record preview**: Hovering over a pillar shows a floating HUD panel with sample data from that field.
- **Entity icons**: Each table has a 3D icon floating above it representing its type (Contact = person silhouette, Account = building, Opportunity = diamond, etc.).

#### Application Launcher
- **App portals**: Model-driven apps, canvas apps, and code apps in the environment are represented as glowing portal gateways — tall rectangular arches with swirling energy effects.
- **App flythrough**: Users can fly into a portal to launch the application. The camera accelerates into the portal with a warp effect before opening the app.
- **App clustering**: Apps are grouped by solution and displayed in their own district of the 3D world.

---

## Data Architecture: Common Data Model (CDM) Integration

### Dataverse Data Access
- All data access goes through the **@microsoft/power-apps** client library using Power Platform connectors (specifically the Dataverse connector).
- The app queries **table metadata** (entity definitions, attributes, relationships) to dynamically build the 3D scene.
- The app queries **solution metadata** to discover apps, components, and their relationships.
- Record data is fetched on-demand when a user zooms into a specific table.

### CDM Schema Mapping
The Common Data Model (https://github.com/microsoft/CDM) provides the semantic structure:

- **CDM Entity Groups** define the spatial layout. Tables are grouped by their CDM domain:
  - **Core**: Account, Contact, Activity, Note — center of the world
  - **Sales**: Opportunity, Lead, Quote, Order, Invoice — sales district  
  - **Service**: Case, Knowledge Article, Entitlement, SLA — service district
  - **Marketing**: Campaign, List, Quick Campaign — marketing district
  - **Finance & Operations**: Product, Price List, Currency — operations district
  - **Custom**: User-created tables — frontier/expansion zone at the edges

- **Hierarchy**: Parent-child table relationships translate to platform elevation (child tables float slightly above and adjacent to parent tables).
- **Relationship density**: Tables with many relationships are placed more centrally. Isolated tables drift to the periphery.

### Data Flow
```
Dataverse API (via Power Apps connectors)
    ↓
Metadata Layer (tables, columns, relationships, solutions, apps)
    ↓
CDM Classifier (maps tables to CDM domains for spatial grouping)
    ↓
Scene Graph Generator (computes positions, sizes, relationships)
    ↓
React Three Fiber Scene (renders the 3D world)
    ↓
Interaction Layer (navigation, selection, HUD panels)
```

---

## AI Agent: The Vibe Coder

### Concept
An AI agent avatar exists within the 3D world. The user can approach the agent (or summon it) to interact conversationally. The agent helps the user:

1. **Explore**: "Show me all tables related to Accounts" — the agent highlights relationship beams and flies the camera along them.
2. **Understand**: "What data is in the Opportunity table?" — the agent opens a HUD panel with schema details and sample records.
3. **Vibe Code**: "Create a new app that shows Contacts and their Cases" — the agent begins constructing a new application. As the agent works, new 3D objects materialize in the scene in real-time:
   - A new portal gateway appears for the app being created.
   - Relationship beams light up between the tables being used.
   - Component blocks (forms, views, dashboards) appear as floating 3D elements within the portal.
4. **Modify**: "Add a chart showing Cases by status" — a new 3D chart element materializes and attaches to the app portal.

### Agent Avatar Design
- **Appearance**: A holographic geometric figure — think a wireframe humanoid made of glowing lines and nodes, floating slightly above the ground. Subtle idle animation (breathing, particles orbiting).
- **Interaction**: The user clicks on the agent or presses a hotkey to open a chat panel. The chat panel is a floating translucent HUD that appears in 3D space, anchored near the agent.
- **Voice**: Optional text-to-speech for agent responses using browser speech synthesis API.
- **Animation**: When the agent "creates" something, it projects beams of light from its hands toward the location where the new object materializes, with particle burst effects.

### Agent Backend
- The agent communicates with **Dataverse MCP** (Model Context Protocol) server for data operations.
- For vibe coding actions (creating apps, components), the agent sends instructions to the Power Platform via the appropriate connectors/APIs.
- Agent conversation UI is a React component rendered as an HTML overlay on the 3D canvas.

---

## Project Structure

```
dataverse-vibe-explorer/
├── public/
│   ├── textures/          # Skybox, platform textures, particle sprites
│   ├── models/            # 3D models (agent avatar, icons) in GLTF format
│   └── fonts/             # 3D fonts for Text3D labels
├── src/
│   ├── main.tsx           # App entry point
│   ├── App.tsx            # Root component, canvas setup
│   ├── scene/
│   │   ├── World.tsx          # Main 3D scene composition
│   │   ├── Platform.tsx       # Table platform component
│   │   ├── Pillar.tsx         # Column/field pillar component
│   │   ├── RelationshipBeam.tsx # Glowing connection lines
│   │   ├── AppPortal.tsx      # Application launcher portal
│   │   ├── AgentAvatar.tsx    # AI agent 3D model + animations
│   │   ├── Skybox.tsx         # Environment / skybox
│   │   ├── ParticleField.tsx  # Ambient particles
│   │   └── Minimap.tsx        # 2D overhead minimap
│   ├── ui/
│   │   ├── HudPanel.tsx       # Floating data inspection panel
│   │   ├── ChatPanel.tsx      # Agent conversation interface
│   │   ├── Breadcrumbs.tsx    # Navigation history trail
│   │   └── SearchBar.tsx      # Quick search for tables/entities
│   ├── data/
│   │   ├── dataverse.ts       # Dataverse connector wrapper
│   │   ├── metadata.ts        # Table/column/relationship metadata fetcher
│   │   ├── cdmClassifier.ts   # CDM domain classification logic
│   │   └── sceneGraph.ts      # Spatial layout computation
│   ├── agent/
│   │   ├── agentService.ts    # Agent communication (MCP/AI backend)
│   │   ├── vibeActions.ts     # Vibe coding action handlers
│   │   └── agentState.ts      # Agent state management
│   ├── controls/
│   │   ├── FlyControls.tsx    # WASD + mouse fly-through controls
│   │   └── CameraManager.tsx  # Camera transitions and cinematics
│   ├── store/
│   │   └── appStore.ts        # Zustand global state store
│   └── utils/
│       ├── colors.ts          # CDM domain color palette
│       └── layout.ts          # Layout algorithms (force-directed, grid)
├── power.config.json          # Auto-generated Power Apps config
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## Implementation Phases

### Phase 1: Foundation
- Scaffold Power Apps Code App from Vite template.
- Set up React Three Fiber with postprocessing (bloom, vignette).
- Create the skybox, ambient particle system, and ground plane grid.
- Implement fly-through camera controls (WASD + mouse).
- Build static demo scene with placeholder platforms and pillars.

### Phase 2: Dataverse Integration
- Integrate `@microsoft/power-apps` client library.
- Fetch table metadata (entities, columns, relationships) from Dataverse.
- Implement CDM domain classifier to group tables spatially.
- Build the scene graph generator (force-directed layout algorithm for table positions).
- Render real Dataverse tables as 3D platforms with column pillars.
- Render relationship beams between connected tables.

### Phase 3: Interaction & Inspection
- Implement click-to-select on platforms/pillars.
- Build the floating HUD panel for data inspection.
- Fetch and display sample records on hover/select.
- Implement smooth camera transitions (fly-to-table, orbit mode).
- Add 2D minimap overlay.
- Implement search bar for quick table/entity lookup.

### Phase 4: Application Launcher
- Fetch solution/app metadata from Dataverse.
- Render app portals as gateway arches grouped by solution.
- Implement portal flythrough animation + app launch.
- Link to actual Power Apps play URLs for app launching.

### Phase 5: AI Agent
- Build the holographic agent avatar with idle animations.
- Implement the chat panel UI (floating HUD in 3D space).
- Connect agent to Dataverse MCP server for data exploration commands.
- Implement "show me" commands (camera navigation to entities, highlight relationships).
- Implement "explain" commands (schema + data display).

### Phase 6: Vibe Coding
- Implement vibe coding actions (agent creates apps/components via Power Platform APIs).
- Real-time 3D materialization effects — objects appear as the agent builds.
- Beam projection + particle burst animations for creation events.
- Live preview of created components within the 3D scene.

### Phase 7: Polish & Deploy
- Performance optimization: LOD system, instancer rendering, lazy data loading.
- Accessibility: keyboard navigation, screen reader descriptions for 3D objects.
- Responsive design for different viewport sizes.
- Power Apps header hiding (`hideNavBar=true`).
- Final deployment via `npm run build && npx power-apps push`.

---

## Technical Notes

### Performance Budget
- Target 60fps on mid-range hardware.
- Use instanced geometry for repeated elements (pillars, particles).
- Implement Level-of-Detail (LOD): distant platforms render as simple shapes, nearby ones show full detail.
- Lazy-load record data only when user zooms into a table.
- Use frustum culling (built into Three.js) to skip rendering off-screen objects.

### Dataverse API Strategy
- Fetch all table metadata on initial load (entity definitions are lightweight).
- Cache metadata in Zustand store.
- Fetch record data on-demand with pagination.
- Use relationship metadata to build the beam graph.

### Accessibility
- All 3D objects have `aria-label` equivalents in the HTML overlay.
- Keyboard-only navigation mode as fallback.
- High-contrast mode option that uses solid colors instead of glass/glow effects.
