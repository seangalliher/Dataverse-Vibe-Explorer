# Dataverse Vibe Explorer — Implementation Plan

> *"It's a Dataverse system. I know this."*

---

## Vision Statement

The Dataverse Vibe Explorer is not just a tool — it's an **experience**. The moment someone opens this app, they should feel like they've stepped into a living, breathing digital universe where their data has form, light, and dimension. This is the app that makes people say *"I had no idea exploring metadata could feel like this."*

We are building the most visually stunning, emotionally compelling data exploration experience ever created on the Power Platform. Every interaction should feel cinematic. Every animation should feel alive. Every discovery should feel rewarding.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    POWER APPS CODE APP HOST                      │
│                  (Entra Auth · Connectors · CDN)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐ │
│  │  React + TS   │  │ Zustand Store  │  │  Dataverse MCP AI   │ │
│  │  Vite SPA     │  │ (State Spine)  │  │  Agent Backend      │ │
│  └──────┬───────┘  └───────┬───────┘  └──────────┬───────────┘ │
│         │                  │                      │             │
│  ┌──────▼──────────────────▼──────────────────────▼───────────┐ │
│  │              REACT THREE FIBER RENDER PIPELINE              │ │
│  │                                                             │ │
│  │  Canvas ─► Scene Graph ─► Post-Processing ─► Output        │ │
│  │              │                   │                          │ │
│  │         3D Components      Bloom · DOF                     │ │
│  │         Instanced Meshes   Vignette · God Rays             │ │
│  │         Shader Materials   Chromatic Aberration             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    HTML OVERLAY LAYER                        │ │
│  │  HUD · Chat Panel · Search · Minimap · Breadcrumbs         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | React 18 + TypeScript | Power Apps Code Apps requirement |
| **Bundler** | Vite 5 | Fast HMR, tree-shaking, official template |
| **3D Engine** | Three.js + React Three Fiber | Declarative 3D in JSX, zero-overhead reconciler |
| **3D Helpers** | @react-three/drei | Pre-built cameras, text, env maps, Float, effects |
| **Post-FX** | @react-three/postprocessing | Bloom, DOF, vignette, god rays — the "wow" layer |
| **State** | Zustand | Lightweight, R3F-ecosystem standard |
| **Debug** | Leva | Runtime parameter tuning during dev |
| **Platform** | @microsoft/power-apps | Dataverse connectors, auth, deployment |
| **AI** | Dataverse MCP Server | Agent data access + vibe coding actions |
| **Animation** | GSAP or spring-based (drei) | Cinematic camera transitions & materialization FX |

---

## Implementation Phases

### Phase 1: The Stage — Foundation & Atmosphere
**Goal**: *A person opens the app and instantly says "whoa."*

Before any data, before any logic — we build the **stage**. The environment itself must be captivating enough that someone would stare at it for 30 seconds just taking it in.

#### 1.1 Project Scaffolding
- [ ] Scaffold from Power Apps Code Apps Vite template
- [ ] Install core dependencies: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `zustand`, `leva`
- [ ] Configure TypeScript strict mode, path aliases (`@/scene/*`, `@/ui/*`, `@/data/*`)
- [ ] Set up Vite config with Three.js optimizations (tree-shaking, chunk splitting)
- [ ] Create base `App.tsx` with R3F `<Canvas>` and post-processing pipeline

#### 1.2 The Void — Skybox & Environment
- [ ] Deep-space skybox: gradient from midnight indigo (#0a0a2e) to pure black, with faint animated nebula wisps
- [ ] Subtle star field using instanced points (thousands of tiny white dots with slight twinkle animation via time-based opacity)
- [ ] Distant horizon glow — a soft cyan/purple ring at the far edge, like a sunrise in space
- [ ] Environment map for reflections on glass materials (HDRI or generated)

#### 1.3 The Grid — Ground Plane
- [ ] Infinite ground grid rendered with a custom shader: thin glowing lines fading to transparency at distance
- [ ] Grid lines pulse subtly outward from center (radial wave animation) — the world feels alive, like a heartbeat
- [ ] Grid color matches the accent palette (cyan/teal with subtle purple undertones)
- [ ] Grid fades out below the camera to avoid harsh bottom edge

#### 1.4 The Breath — Particle Systems
- [ ] Ambient "data mote" particles: thousands of tiny glowing dots drifting slowly through the scene
- [ ] Particles use instanced rendering for performance (InstancedBufferGeometry)
- [ ] Subtle size variation and gentle sine-wave drift patterns
- [ ] Particles respond to camera proximity — gently part when the camera moves through them
- [ ] Color gradient from cyan to white to soft purple

#### 1.5 The Eye — Camera & Controls
- [ ] Fly-through camera: WASD movement + mouse look (pointer lock on click)
- [ ] Smooth acceleration/deceleration (not instant speed changes — feels like floating)
- [ ] Speed boost with Shift key
- [ ] Camera bob: very subtle sine-wave vertical oscillation during movement (presence, not nausea)
- [ ] Orbit mode toggle: click a platform to orbit it; Escape to return to fly mode
- [ ] Cinematic auto-orbit on idle (slowly rotate if user hasn't moved for 10s)

#### 1.6 Post-Processing — The Wow
- [ ] **Bloom**: Selective bloom on emissive materials — platforms glow, beams glow, particles glow. High threshold so only bright elements bloom, not the whole scene.
- [ ] **Vignette**: Subtle dark edges pull focus to center
- [ ] **Chromatic aberration**: Very slight, at screen edges only — cinematic feel
- [ ] **Tone mapping**: ACES filmic for rich, cinematic contrast
- [ ] Leva debug panel for real-time post-FX tuning

#### 1.7 Demo Scene — Proof of Life
- [ ] 6-8 static placeholder platforms (hexagonal, floating, with glow)
- [ ] Each platform has a few placeholder pillars
- [ ] Placeholder glowing beams connecting some platforms
- [ ] Floating text labels (using drei `<Text>` or `<Text3D>`)
- [ ] Everything uses the glass/crystal material with inner glow

**Exit Criteria**: Someone can open the app, see a gorgeous 3D space scene with glowing platforms, fly through it with WASD, and feel genuinely impressed. No data integration needed yet — pure visual impact.

---

### Phase 2: The Data — Dataverse Integration
**Goal**: *The 3D world is no longer a demo — it's YOUR Dataverse, alive in 3D.*

#### 2.1 Dataverse Connection Layer
- [ ] Create `dataverse.ts` wrapper around `@microsoft/power-apps` connector APIs
- [ ] Fetch table/entity metadata: entity definitions, display names, descriptions
- [ ] Fetch column/attribute metadata: data types, display names, required status
- [ ] Fetch relationship metadata: one-to-many, many-to-many, self-referential
- [ ] Fetch record counts per table (aggregate query)
- [ ] Handle auth gracefully (Power Apps host provides token; detect and surface errors)

#### 2.2 CDM Domain Classifier
- [ ] Map well-known Dataverse tables to CDM domains:
  - 🔵 **Core** (Account, Contact, Activity, Note, SystemUser) → center
  - 🔷 **Sales** (Opportunity, Lead, Quote, Order, Invoice) → northeast sector
  - 🟢 **Service** (Case, KnowledgeArticle, Entitlement, SLA) → southeast sector
  - 🟣 **Marketing** (Campaign, List, QuickCampaign) → southwest sector
  - 🟠 **Finance** (Product, PriceList, Currency) → northwest sector
  - ⬜ **Custom** (user-created tables) → outer ring / frontier
- [ ] Classify by table schema name prefix for custom tables (group by solution publisher prefix)
- [ ] Each domain gets a distinct accent color and spatial zone

#### 2.3 Scene Graph Generator — Layout Engine
- [ ] Force-directed layout algorithm that respects domain zones
- [ ] Tables with more relationships pull toward center (gravity based on relationship count)
- [ ] Tables within the same domain cluster together
- [ ] Platform size scales logarithmically with record count (min/max clamp to avoid extremes)
- [ ] Elevation based on table hierarchy (child entities float slightly above parents)
- [ ] Layout is deterministic given the same metadata (seeded positions, stable across sessions)
- [ ] Smooth animated transitions when layout updates

#### 2.4 Dynamic Platform Rendering
- [ ] Replace placeholder platforms with real Dataverse table data
- [ ] Platform material: glass/crystal with domain-colored inner glow
- [ ] Platform shape: hexagonal prism with beveled edges
- [ ] Floating animation: gentle hover using drei `<Float>` with slight rotation
- [ ] Pillar generation: top N columns per table (configurable, default 8)
- [ ] Pillar height: proportional to non-null value count or data type importance
- [ ] Pillar material: translucent columns with data-type color coding
- [ ] 3D text labels: table display name floating above each platform
- [ ] Record count badge: small glowing number near the platform

#### 2.5 Relationship Beams
- [ ] Glowing bezier-curve beams connecting related tables
- [ ] Beam color matches source domain color
- [ ] Beam thickness indicates relationship strength (1:N thinner, N:N thicker)
- [ ] Animated energy flow along beams (UV scroll shader — particles flowing from parent to child)
- [ ] Beams fade with distance to reduce visual clutter at overview zoom levels
- [ ] On hover/select: related beams brighten, unrelated ones dim

**Exit Criteria**: The user sees their actual Dataverse tables rendered in 3D space, correctly grouped by domain, with relationship connections visible. Flying through their actual data for the first time should produce genuine delight.

---

### Phase 3: The Touch — Interaction & Inspection
**Goal**: *Every click reveals something. Every hover tells a story. The data wants to be explored.*

#### 3.1 Selection & Highlighting
- [ ] Raycasting on click/hover for platform and pillar selection
- [ ] Hover glow: platforms brighten subtly on mouse hover (emissive intensity boost)
- [ ] Click select: selected platform gets a bright outline ring / pulse animation
- [ ] Related tables highlight when a table is selected (relationship beams brighten)
- [ ] Unrelated objects dim slightly to reduce visual noise (focus mode)

#### 3.2 Floating HUD Panel — Data Inspector
- [ ] Translucent glassmorphism panel that appears near selected platform
- [ ] Animated entrance: panel materializes with a scale/fade animation
- [ ] Displays: table name, description, record count, column list, relationship list
- [ ] Column details: name, data type (with icon), required marker
- [ ] Relationship list: clickable links that fly camera to related table
- [ ] Panel tracks the 3D position of the selected object (billboard behavior)
- [ ] Dismiss with Escape or clicking elsewhere

#### 3.3 Record Preview
- [ ] On deeper inspection (double-click or "View Records" button), fetch top 5 sample records
- [ ] Display in a compact data grid within the HUD panel
- [ ] Lazy loading with spinner animation
- [ ] Records animate in one-by-one (staggered fade-in)

#### 3.4 Camera Transitions — Cinematic Navigation
- [ ] Click-to-fly: clicking a distant platform triggers smooth camera flight to it
- [ ] Flight path: slight arc trajectory (not straight line) for cinematic feel
- [ ] Duration: ~1.5 seconds with ease-in-out
- [ ] On arrival: camera settles into orbit mode around the selected table
- [ ] Double-tap Escape: camera pulls back to overview position
- [ ] Transition interruption: starting a WASD movement cancels any in-flight transition

#### 3.5 Minimap
- [ ] 2D top-down overhead view rendered in corner (HTML overlay, not 3D)
- [ ] Shows all platforms as colored dots (domain color)
- [ ] Player position indicator (glowing dot with direction cone)
- [ ] Click on minimap to teleport camera
- [ ] Minimap highlights current selection
- [ ] Collapsible with a toggle button

#### 3.6 Search
- [ ] Command-palette style search bar (Ctrl+K / Cmd+K to open)
- [ ] Fuzzy search across table names, column names, app names
- [ ] Results dropdown with icons and domain color indicators
- [ ] Selecting a result flies camera to that table
- [ ] Search bar is an HTML overlay with glassmorphism styling

#### 3.7 Breadcrumb Trail
- [ ] Glowing path line showing navigation history in 3D space
- [ ] Trail fades over time (last 10 visited platforms)
- [ ] Subtle particle effect along the trail path
- [ ] Clicking a breadcrumb node flies back to that earlier position

**Exit Criteria**: The user can search, click, hover, navigate, and inspect any table in their Dataverse. The interaction loop is addictive — every click reveals something new, every transition feels polished.

---

### Phase 4: The Gateway — Application Launcher
**Goal**: *Dataverse apps appear as futuristic portal gates you can fly into.*

#### 4.1 App Metadata
- [ ] Fetch Model-Driven App metadata from Dataverse solutions
- [ ] Fetch Canvas App metadata via connector
- [ ] Map apps to their associated tables (site map → table references)
- [ ] Group apps by solution

#### 4.2 Portal Gateways
- [ ] Tall rectangular arch geometry with rounded top
- [ ] Swirling energy effect inside the portal (animated shader with noise distortion)
- [ ] Portal color matches the primary table domain it relates to
- [ ] App name in glowing text above the portal arch
- [ ] Portals placed near their primary associated table cluster

#### 4.3 Portal Interaction
- [ ] Approach detection: portal energizes as camera gets close (glow intensifies, sound-like visual cue)
- [ ] Click or fly-through triggers app launch sequence:
  1. Camera accelerates toward portal center
  2. Screen white-flash transition effect
  3. New browser tab/window opens with app play URL
  4. Camera snaps back to pre-launch position in explorer
- [ ] Portal "recently launched" glow indicator

#### 4.4 Solution Districts
- [ ] Group portals by solution into spatial clusters
- [ ] Solution name as a floating district sign
- [ ] Visual boundary around solution clusters (subtle ground plane color change or low wall geometry)

**Exit Criteria**: Users can see all their Power Apps as glowing portals in the 3D world, fly into them to launch, and understand how apps relate to underlying tables.

---

### Phase 5: The Guide — AI Agent
**Goal**: *A holographic AI guide that makes you feel like you have a genius data architect by your side.*

#### 5.1 Agent Avatar
- [ ] Geometric wireframe humanoid figure: lines + nodes, translucent
- [ ] Floating above ground with gentle hover animation
- [ ] Particle orbit animation: small data motes orbit the avatar
- [ ] Idle animation: subtle breathing motion, occasional head turn
- [ ] Summoning animation: particles converge → flash → avatar materializes
- [ ] Avatar can be summoned with hotkey (Tab) or by clicking its minimap icon

#### 5.2 Chat Panel
- [ ] Glassmorphism chat panel — floating HUD in HTML overlay
- [ ] Message bubbles with typing indicator
- [ ] Markdown rendering in responses
- [ ] Collapsible/expandable
- [ ] Chat history persists during session
- [ ] Suggested prompt chips for common queries:
  - "Show me all tables"
  - "What is this table?"
  - "Find tables related to [selected]"
  - "Take me on a tour"

#### 5.3 Agent Intelligence — Dataverse MCP
- [ ] Connect to Dataverse MCP server (already configured in `.vscode/mcp.json`)
- [ ] Implement exploration commands:
  - **Navigate**: "Show me Accounts" → agent flies camera to Account table, highlights it
  - **Explain**: "Describe this table" → agent reads metadata and presents schema summary
  - **Relate**: "How is Contact related to Account?" → beams highlight, camera follows the relationship path
  - **Tour**: "Give me a tour" → agent flies through all domains, narrating each zone
  - **Analyze**: "Which table has the most records?" → agent highlights the largest platform

#### 5.4 Agent Animations — Making AI Feel Alive
- [ ] When agent "thinks": particle orbit speeds up, subtle glow pulse
- [ ] When agent "speaks": text appears word-by-word with accompanying glow pulse
- [ ] When agent navigates: avatar gestures in the direction, then camera follows
- [ ] When agent highlights: beams projected from avatar's hands toward target (light cone effect)

**Exit Criteria**: The AI agent feels like a genuine guide — conversing naturally, moving the camera, highlighting data, and making the entire exploring experience feel magical and guided.

---

### Phase 6: The Forge — Vibe Coding
**Goal**: *Ask the AI to build something and watch it materialize in 3D before your eyes.*

#### 6.1 Creation Commands
- [ ] "Create an app for managing Contacts" → agent begins app creation flow
- [ ] "Add a view of active Cases" → agent adds component to existing app
- [ ] "Build a dashboard for Sales pipeline" → agent constructs dashboard

#### 6.2 Materialization Visual Effects
- [ ] **Blueprint phase**: Wireframe outline of the new object appears first (transparent blue lines)
- [ ] **Construction phase**: Wireframe fills in with material, panel by panel, with sparking particle effects at construction edges
- [ ] **Completion phase**: Object solidifies with a bright flash, portal gateway activates with energy swirl
- [ ] Sound-design-like visual cues: each construction step has a distinct visual "beat"

#### 6.3 Real-time Feedback
- [ ] Progress indicator in agent chat: "Creating app... Configuring tables... Adding views..."
- [ ] Each step triggers a corresponding 3D animation
- [ ] If creation fails, the blueprint wireframe flickers and fades with a red tint
- [ ] On success, relationship beams automatically connect to the new app portal

#### 6.4 Power Platform API Integration
- [ ] Use Power Platform connectors to create actual Model-Driven App definitions
- [ ] Create and configure SiteMaps, Forms, Views via API
- [ ] Register the created app in the environment
- [ ] Link newly created portal to the real app play URL

**Exit Criteria**: Users can speak a creation command, watch the AI materialize a real app in 3D, and then fly into the portal to open the actual working application. This is the moment that sells the entire concept.

---

### Phase 7: The Polish — Performance, Accessibility & Deployment
**Goal**: *Buttery smooth at 60fps, accessible to all, deployable in one command.*

#### 7.1 Performance
- [ ] LOD system: distant platforms → simple billboards; mid-range → low-poly; close-up → full detail
- [ ] Instanced rendering for all repeated geometries (pillars, particles, beams)
- [ ] Frustum culling (built-in Three.js, verify it's active)
- [ ] Lazy data loading: only fetch records when user inspects a specific table
- [ ] Texture atlasing for platform materials to reduce draw calls
- [ ] Web Worker for force-directed layout computation (prevent main thread jank)
- [ ] Performance monitoring: FPS counter in dev mode, automatic quality downscaling if FPS drops below 30

#### 7.2 Accessibility
- [ ] Full keyboard navigation: Tab through platforms, Enter to select, Arrow keys to browse
- [ ] Screen reader descriptions: ARIA labels on HTML overlay elements describing 3D scene state
- [ ] High-contrast mode: solid colors, no transparency, stronger outlines, no post-processing effects
- [ ] Reduced motion mode: disables particles, floating animations, camera bob
- [ ] Focus indicators visible in both 3D and 2D layers

#### 7.3 Responsive Design
- [ ] Adapt to smaller viewports (tablet-size minimum)
- [ ] Touch controls: drag to look, pinch to zoom, tap to select
- [ ] Mobile-friendly UI panels (bottom sheet pattern instead of floating HUD)
- [ ] Performance quality auto-adjust based on device capability

#### 7.4 Deployment
- [ ] `npm run build` produces optimized bundle (code-split, tree-shaken, minified)
- [ ] `npx power-apps push` deploys to Power Platform environment
- [ ] `?hideNavBar=true` mode tested and verified
- [ ] Environment-specific configuration (dev/staging/prod Dataverse orgs)
- [ ] Error boundary UI: if 3D fails to load, show graceful 2D fallback with clear messaging

---

## Visual Design System

### Color Palette

| Domain | Primary | Glow | Accent |
|---|---|---|---|
| Core | `#00f0ff` (Cyan) | `#00f0ff40` | `#80ffff` |
| Sales | `#3b82f6` (Blue) | `#3b82f640` | `#93c5fd` |
| Service | `#10b981` (Emerald) | `#10b98140` | `#6ee7b7` |
| Marketing | `#a855f7` (Purple) | `#a855f740` | `#d8b4fe` |
| Finance | `#f59e0b` (Amber) | `#f59e0b40` | `#fcd34d` |
| Custom | `#f8fafc` (Slate) | `#f8fafc40` | `#cbd5e1` |

### Background
- Skybox: `#0a0a2e` → `#000000` gradient
- Grid lines: `#00f0ff15` with `#00f0ff40` pulse
- Ambient particles: white → cyan → purple gradient

### Materials
- **Glass/Crystal**: `MeshPhysicalMaterial` with transmission=0.6, roughness=0.1, ior=1.5, thickness=0.5, emissive=[domain color], emissiveIntensity=0.3
- **Beams**: `MeshBasicMaterial` with emissive color + custom UV scroll shader for energy flow
- **Text**: `MeshStandardMaterial` with emissive white, bloom threshold tuned to make text glow

### Typography
- UI overlays: Inter or system sans-serif, with `backdrop-filter: blur(20px)` glassmorphism
- 3D labels: SDF-based `<Text>` from drei (crisp at any distance)

---

## Project Structure (Final)

```
dataverse-vibe-explorer/
├── public/
│   ├── textures/
│   │   ├── nebula.jpg          # Skybox nebula overlay
│   │   ├── particle.png        # Circular gradient particle sprite
│   │   └── noise.png           # Noise texture for shaders
│   ├── env/
│   │   └── studio.hdr          # HDR environment map for reflections
│   └── fonts/
│       └── inter-medium.woff   # Font for 3D text SDF rendering
├── src/
│   ├── main.tsx                # App entry point (strict mode, R3F canvas)
│   ├── App.tsx                 # Root: Canvas + HTML overlay + state init
│   ├── scene/
│   │   ├── World.tsx           # Master scene composition
│   │   ├── Platform.tsx        # Single table platform (hex, glass, glow)
│   │   ├── Pillar.tsx          # Column/field pillar (data-type colored)
│   │   ├── RelationshipBeam.tsx # Glowing bezier beam with energy flow
│   │   ├── AppPortal.tsx       # App launcher portal gate
│   │   ├── AgentAvatar.tsx     # AI agent wireframe humanoid
│   │   ├── Skybox.tsx          # Deep space environment
│   │   ├── GridFloor.tsx       # Infinite pulsing grid plane shader
│   │   ├── ParticleField.tsx   # Instanced ambient data motes
│   │   └── BreadcrumbTrail.tsx # Glowing navigation history path
│   ├── ui/
│   │   ├── HudPanel.tsx        # Glassmorphism data inspection overlay
│   │   ├── ChatPanel.tsx       # AI agent conversation interface
│   │   ├── Minimap.tsx         # 2D top-down overhead minimap
│   │   ├── SearchBar.tsx       # Cmd+K command palette search
│   │   ├── Toolbar.tsx         # Controls: camera mode, accessibility toggles
│   │   └── LoadingScreen.tsx   # Cinematic loading/intro sequence
│   ├── data/
│   │   ├── dataverse.ts        # @microsoft/power-apps connector wrapper
│   │   ├── metadata.ts         # Table/column/relationship metadata API
│   │   ├── cdmClassifier.ts    # Domain classification engine
│   │   ├── sceneGraph.ts       # Force-directed spatial layout generator
│   │   └── appMetadata.ts      # Solution/App metadata fetcher
│   ├── agent/
│   │   ├── agentService.ts     # MCP server communication layer
│   │   ├── agentCommands.ts    # Command parser + execution engine
│   │   ├── vibeActions.ts      # App creation/modification via APIs
│   │   └── agentState.ts       # Agent state (position, speaking, thinking)
│   ├── controls/
│   │   ├── FlyControls.tsx     # WASD + mouse fly-through controller
│   │   └── CameraManager.tsx   # Cinematic transitions, orbit, auto-orbit
│   ├── shaders/
│   │   ├── gridFloor.glsl      # Infinite grid shader with pulse
│   │   ├── portalSwirl.glsl    # Portal energy vortex effect
│   │   └── beamFlow.glsl       # Relationship beam energy flow
│   ├── store/
│   │   └── appStore.ts         # Zustand global state
│   └── utils/
│       ├── colors.ts           # Domain color palette constants
│       ├── layout.ts           # Force-directed layout math
│       └── easing.ts           # Camera animation easing curves
├── power.config.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## The Loading Experience

First impressions matter most. When the app loads:

1. **Black screen** → faint grid lines fade in, pulsing outward from center (0-1s)
2. **Stars appear** → tiny points of light twinkle into existence (1-2s)
3. **Nebula wisp** → background gradient shifts from black to deep indigo (2-3s)
4. **"Connecting to Dataverse..."** → subtle text with typing animation (3-4s)
5. **Data motes stream in** → particles flow from edges toward center (4-5s)
6. **Platforms materialize** → one by one, tables appear with a flash and settle into position (5-7s)
7. **Beams connect** → relationship lines shoot between platforms with energy flow (7-8s)
8. **Camera begins gentle orbit** → user is now in the world (8s+)
9. **Subtle prompt appears**: *"WASD to explore · Click to inspect · Ctrl+K to search"*

This loading sequence IS the onboarding. No tutorial needed. The world builds itself in front of you.

---

## What Makes This Extraordinary

### 1. Emotional Design
Every element serves emotion. The bloom makes things feel warm and magical. The particles make the space feel alive. The camera transitions make navigation feel cinematic. The glass materials make data feel precious.

### 2. Zero-Tutorial Onboarding
The loading sequence teaches by showing. The suggested actions appear contextually. The agent is always ready to help. Nothing requires a manual.

### 3. Real Data, Real Impact
This isn't a demo with fake data. The moment the user sees THEIR tables, THEIR apps, THEIR relationships — it becomes personal. That's the moment of delight.

### 4. The AI as Character
The agent isn't a chatbot in a sidebar. It's a character IN the world. It gestures, it leads, it creates. It turns data exploration from a solo activity into a guided adventure.

### 5. The Creation Moment
Watching the AI materialize a new app in 3D — blueprint to wireframe to solid object — is the kind of moment people record and share. It's AI made visible.

---

## Implementation Priority & Dependency Graph

```
Phase 1 (Foundation)
    │
    ├──► Phase 2 (Data) ──► Phase 3 (Interaction) ──► Phase 4 (Apps)
    │                                                       │
    │                                                       ▼
    │                                              Phase 5 (AI Agent)
    │                                                       │
    │                                                       ▼
    │                                              Phase 6 (Vibe Coding)
    │
    └──► Phase 7 (Polish) — runs in parallel with Phases 3-6
```

- **Phase 1** is the foundation everything builds on — must be solid and visually impressive
- **Phase 2** can start as soon as Phase 1's canvas and scene are working
- **Phase 3** requires Phase 2's data-driven platforms
- **Phase 4** requires Phase 2's metadata layer
- **Phase 5** requires Phase 3's interaction patterns (camera transitions, HUD panels)
- **Phase 6** requires Phase 5's agent infrastructure
- **Phase 7** (performance/accessibility) is continuous and runs alongside all phases

---

## Success Metrics

The app succeeds when:
- **First 3 seconds**: User says "wow" or equivalent
- **First 30 seconds**: User is actively exploring (moving camera, clicking things)
- **First 2 minutes**: User has inspected at least one table's details
- **First 5 minutes**: User has tried the search or asked the AI agent something
- **First demo to a colleague**: User says "you have to see this"

---

*This is not just a Dataverse viewer. This is datascaping — turning the invisible architecture of your data into a world you can walk through, touch, and shape. Let's build it.*
