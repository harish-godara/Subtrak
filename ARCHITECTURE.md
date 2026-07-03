# SubTrack — Architecture Document

> **SubTrack** is a SaaS subscription management dashboard that lets users track subscriptions, monitor credit balances, visualize spending, and auto-refresh data via API integrations or browser automation.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [System Architecture Diagram](#2-system-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Data Flow & Integration Methods](#6-data-flow--integration-methods)
7. [Directory Structure](#7-directory-structure)
8. [File-by-File Breakdown](#8-file-by-file-breakdown)
9. [Data Model](#9-data-model)
10. [Communication Protocols](#10-communication-protocols)
11. [Development Workflow](#11-development-workflow)

---

## 1. High-Level Overview

SubTrack is a **full-stack, single-page application (SPA)** with two independently running tiers:

| Tier | Technology | Port | Role |
|------|-----------|------|------|
| **Frontend** | Vanilla JS + Vite | `5173` | UI rendering, routing, localStorage CRUD |
| **Backend** | Python FastAPI + Uvicorn | `8000` | API proxying, Playwright script execution, WebSocket streaming |

The frontend is a **zero-framework** vanilla JavaScript SPA that uses hash-based routing (`#/`, `#/integrate`, etc.). It stores all subscription data in the browser's `localStorage` — there is **no database**. The backend exists solely to:

1. Proxy external API calls (bypassing CORS).
2. Execute Python/Playwright automation scripts and stream their I/O over WebSockets.

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                               │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    VITE DEV SERVER (:5173)                    │  │
│  │                                                               │  │
│  │  index.html ──► src/main.js (SPA entry point)                │  │
│  │       │                                                       │  │
│  │       ├── Hash Router (#/, #/integrate, #/analytics, etc.)   │  │
│  │       │                                                       │  │
│  │       ├── Pages:     dashboard, integrate, analytics,        │  │
│  │       │              settings, detail (modal)                │  │
│  │       │                                                       │  │
│  │       ├── Components: sidebar, modal, terminal, toast        │  │
│  │       │                                                       │  │
│  │       ├── Utils:      api, storage, helpers, chart,          │  │
│  │       │               curl-parser                            │  │
│  │       │                                                       │  │
│  │       └── Data Store: localStorage (browser)                 │  │
│  └───────────────────────┬───────────────────────────────────────┘  │
│                          │                                          │
│                   Vite Proxy (/api → :8000, /ws → ws://:8000)      │
│                          │                                          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND (:8000)                           │
│                                                                     │
│  main.py ──► app = FastAPI()                                       │
│       │                                                             │
│       ├── GET  /api/health          → Health check                 │
│       │                                                             │
│       ├── POST /api/proxy           → HTTP proxy (Method A)        │
│       │   └── routes/proxy.py       → httpx async client           │
│       │                                                             │
│       ├── CRUD /api/scripts         → Script management            │
│       │   └── routes/scripts.py     → Save/List/Delete .py files   │
│       │                                                             │
│       ├── POST /api/run-script      → Start script execution       │
│       │                                                             │
│       └── WS   /ws/script/{id}/{eid} → WebSocket I/O stream       │
│           └── routes/scripts.py      → Subprocess + stdin/stdout   │
│                                                                     │
│  scripts/                                                           │
│       ├── interakt.py  → Playwright: Interakt token + wallet API   │
│       └── gallabox.py  → Playwright: Gallabox token + /api/me      │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │  EXTERNAL SaaS APIs     │
              │                         │
              │  • Interakt Wallet API  │
              │  • Gallabox /api/me     │
              │  • Any curl-based API   │
              └─────────────────────────┘
```

---

## 3. Technology Stack

### Frontend

| Library/Tool | Version | Purpose |
|---|---|---|
| **Vite** | ^6.0.0 | Dev server with HMR, build tool, proxy configuration |
| **Vanilla JS** | ES2022+ | Zero-framework SPA (no React/Vue/Angular) |
| **Vanilla CSS** | — | Custom design system with CSS variables, dark/light theme |
| **Google Fonts (Inter)** | — | Typography |
| **localStorage** | Web API | Client-side data persistence |
| **WebSocket** | Web API | Real-time script I/O streaming |

### Backend

| Library/Tool | Version | Purpose |
|---|---|---|
| **FastAPI** | ≥0.110.0 | Async REST API framework |
| **Uvicorn** | ≥0.27.0 | ASGI web server |
| **httpx** | ≥0.27.0 | Async HTTP client for proxying external API calls |
| **websockets** | ≥12.0 | WebSocket support for FastAPI |
| **Playwright** | (in scripts) | Browser automation for scraping auth tokens |

### Dev Tooling

| Tool | Purpose |
|---|---|
| **concurrently** | Runs Vite + Python server simultaneously via `npm run dev` |

---

## 4. Frontend Architecture

### 4.1 Routing (Hash-based SPA)

The app uses a simple hash-based router in `src/main.js`:

```
#/           → renderDashboard()
#/integrate  → renderIntegrate()
#/analytics  → renderAnalytics()
#/settings   → renderSettings()
```

On `hashchange`, the router calls the corresponding page render function which writes HTML into `#page-content`. The sidebar is rendered once on init and stays persistent.

### 4.2 Page Architecture

Each page is a self-contained module that exports a `render*()` function:

```
┌─────────────────────────────────────────┐
│                 index.html              │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │ #sidebar │  │    #main-content     │ │
│  │          │  │  ┌────────────────┐  │ │
│  │ Logo     │  │  │ #page-content  │  │ │
│  │ Nav      │  │  │                │  │ │
│  │ Theme    │  │  │ (dynamic page) │  │ │
│  │ Collapse │  │  │                │  │ │
│  │          │  │  └────────────────┘  │ │
│  └──────────┘  └──────────────────────┘ │
│  ┌──────────┐  ┌──────────────┐         │
│  │#modal-root│ │ #toast-root  │         │
│  └──────────┘  └──────────────┘         │
└─────────────────────────────────────────┘
```

### 4.3 Pages

| Page | File | Description |
|------|------|-------------|
| **Dashboard** | `dashboard.js` | Subscription grid with summary cards (active count, monthly spend, total balance, upcoming renewals). Search & filter. Click a card → detail modal. |
| **Integrate** | `integrate.js` | Multi-step wizard to add subscriptions via 3 methods: Curl (Method A), Playwright (Method B), or Manual. Includes field mapping UI. |
| **Analytics** | `analytics.js` | Canvas-rendered donut & bar charts. Category breakdown, top subscriptions, upcoming renewals, summary stats. |
| **Settings** | `settings.js` | Theme toggle (light/dark/system), default currency, backend health check, notification toggle, data export/import/clear. |
| **Detail** | `detail.js` | Modal overlay showing full subscription info, field mappings, raw JSON response, notes editor, refresh & delete actions. |

### 4.4 Components

| Component | File | Description |
|-----------|------|-------------|
| **Sidebar** | `sidebar.js` | Navigation links, theme toggle (sun/moon icon), collapse toggle. Persists collapsed state in localStorage. |
| **Modal** | `modal.js` | Reusable modal with overlay, header, body, footer. Escape/click-outside to close. Animated open/close. |
| **Terminal** | `terminal.js` | Interactive terminal UI for Playwright script output. macOS-style header with dots. Shows `stdout`/`stderr`, input bar for interactive prompts (OTP). |
| **Toast** | `toast.js` | Notification system (success/error/info/warning). Fixed bottom-right. Auto-dismiss. Color-coded left border. |

### 4.5 Utilities

| Utility | File | Purpose |
|---------|------|---------|
| **API Client** | `api.js` | `executeCurl()` (Method A proxy), `saveScript/runScript/connectScriptWS()` (Method B), `checkBackendHealth()` |
| **Storage** | `storage.js` | localStorage CRUD for subscriptions and settings. UUID generation. Export/import/clear. |
| **Helpers** | `helpers.js` | Date formatting, currency formatting (INR/USD/EUR/GBP), JSON path resolver (`resolvePath`), `flattenPaths`, `debounce`, status derivation, SVG icon library. |
| **Chart** | `chart.js` | Lightweight canvas-based rendering: `drawDonutChart()` and `drawBarChart()`. Uses CSS variables for theming. No external chart library. |
| **Curl Parser** | `curl-parser.js` | Parses curl command strings into `{url, method, headers, body}` fetch-compatible config. Handles `-X`, `-H`, `-d`, `--data-raw`, `-u`, `-b`, `--compressed`, line continuations, and quoted strings. |

### 4.6 State Management

- **No global store** — each page manages its own local state via module-scoped variables.
- **Persistent state** → `localStorage` (subscriptions, settings, sidebar collapse, theme).
- **Ephemeral state** → module variables (integrate wizard step, form data, response, field mapping).

### 4.7 Theming

CSS custom properties (`--bg-primary`, `--text-primary`, `--accent`, etc.) are defined on `:root` and toggled via `[data-theme="dark"]`. The theme is applied by setting `document.documentElement.setAttribute('data-theme', theme)`.

---

## 5. Backend Architecture

### 5.1 Server Entry Point (`server/main.py`)

```python
FastAPI(title="SubTrack API", version="1.0.0")
├── CORSMiddleware (origins: localhost:5173)
├── proxy_router  → /api/proxy
├── scripts_router → /api/scripts, /api/run-script
├── ws_router     → /ws/script/{id}/{eid}
└── /api/health   → {"status": "ok"}
```

### 5.2 Route Modules

#### `routes/proxy.py` — Method A: Curl Proxy

- **Endpoint**: `POST /api/proxy`
- **Input**: `{ url, method, headers, body }`
- **Process**: Uses `httpx.AsyncClient` to forward the request to the external API (bypasses CORS, follows redirects, skips SSL verification).
- **Output**: `{ success, status, headers, body }` — body is parsed as JSON when possible.
- **Timeout**: 30 seconds.

#### `routes/scripts.py` — Method B: Script Runner

**REST Endpoints**:
- `POST /api/scripts` — Save a Python script to `server/scripts/`
- `GET /api/scripts` — List all `.py` files in the scripts directory
- `DELETE /api/scripts/{id}` — Delete a script file
- `POST /api/run-script` — Generate an execution ID

**WebSocket Endpoint**:
- `WS /ws/script/{script_id}/{execution_id}` — Interactive script execution
  - Spawns the Python script as an `asyncio.subprocess`
  - Streams `stdout`/`stderr` to the client in real-time
  - Accepts `{ type: "input", text }` messages for interactive prompts (OTP entry)
  - Accepts `{ type: "kill" }` to terminate the process
  - 120-second timeout
  - Looks for `OUTPUT:` prefix in stdout to extract final JSON result

### 5.3 Automation Scripts

| Script | Target | Authentication | Output |
|--------|--------|---------------|--------|
| `interakt.py` | Interakt (WhatsApp API platform) | Email/password login + OTP via Playwright → captures `Token` from request headers | Wallet balance data: `{balance, parked_balance, ...}` |
| `gallabox.py` | Gallabox (WhatsApp API platform) | Email/password login via Playwright → captures `Bearer` token from request headers | Account info from `/api/me` |

**Common pattern**:
1. Launch Chromium via Playwright (non-headless)
2. Try to load stored session state (`state.json` / `istate.json`)
3. If not logged in, fill credentials and submit
4. Intercept network requests to capture auth tokens
5. Call the API with the captured token
6. Print `OUTPUT:` + JSON for the WebSocket handler to capture

---

## 6. Data Flow & Integration Methods

### 6.1 The Three Integration Methods

```
┌─────────────────────────────────────────────────────┐
│            INTEGRATE PAGE — Method Selection        │
│                                                     │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ 📡 Curl     │ │ 🤖 Playwright│ │ ✏️ Manual    │ │
│  │ (Method A)  │ │ (Method B)   │ │              │ │
│  └──────┬──────┘ └──────┬───────┘ └──────┬───────┘ │
│         │               │                │          │
│    5 Steps          5 Steps          2 Steps        │
│    Info→Curl→      Info→Script→     Details→        │
│    Test→Map→Save   Run→Map→Save     Save            │
└─────────┼───────────────┼────────────────┼──────────┘
          │               │                │
          ▼               ▼                ▼
   POST /api/proxy   WS /ws/script/...   (direct save
   → external API    → Playwright run     to localStorage)
          │               │
          ▼               ▼
   JSON Response     JSON Response
          │               │
          └───────┬───────┘
                  ▼
         Field Mapping UI
         (JSON path → subscription field)
                  │
                  ▼
         localStorage.setItem('subtrack_subscriptions', ...)
```

### 6.2 Method A: Curl Proxy Flow

```
User pastes curl → parseCurl() → {url, method, headers, body}
         │
         ▼
Frontend sends POST /api/proxy with fetch config
         │
         ▼
Backend httpx.AsyncClient forwards request to external API
         │
         ▼
Response returned to frontend → Interactive field mapping
         │
         ▼
Subscription saved to localStorage with mapping config
```

### 6.3 Method B: Playwright Flow

```
User pastes Python script → saveScript() to backend
         │
         ▼
runScript() → returns execution_id
         │
         ▼
connectScriptWS() opens WebSocket to /ws/script/{id}/{eid}
         │
         ▼
Backend spawns subprocess → streams stdout/stderr over WS
         │                          │
         │    (if script needs OTP) │
         │         ◄────────────────┘
         │    User types OTP in terminal
         │    → WS sends {type:"input", text:"123456"}
         │    → Backend writes to subprocess stdin
         │
         ▼
Script prints OUTPUT:{json} → Backend captures and sends as
                               {type:"complete", result:{...}}
         │
         ▼
Field mapping → Save to localStorage
```

### 6.4 Data Refresh Flow

For subscriptions with **Method A** (curl), the detail modal has a "Refresh Data" button:

```
Click Refresh → re-parse stored curlCommand
             → POST /api/proxy
             → Apply stored fieldMapping to new response
             → Update subscription in localStorage
             → Re-render dashboard
```

---

## 7. Directory Structure

```
Manage_subscriptions/
├── index.html                  # HTML shell — app container, fonts, meta
├── package.json                # npm config: vite, concurrently
├── vite.config.js              # Vite: proxy /api→:8000, /ws→ws://:8000
│
├── public/
│   └── favicon.svg             # App favicon
│
├── src/                        # ── FRONTEND ──
│   ├── main.js                 # Entry point: router, init, theme
│   │
│   ├── components/
│   │   ├── sidebar.js          # Navigation, theme toggle, collapse
│   │   ├── modal.js            # Reusable modal overlay
│   │   ├── terminal.js         # Interactive terminal for script I/O
│   │   └── toast.js            # Notification toasts
│   │
│   ├── pages/
│   │   ├── dashboard.js        # Subscription grid, summary cards
│   │   ├── integrate.js        # Multi-step add wizard (Curl/Playwright/Manual)
│   │   ├── detail.js           # Subscription detail modal
│   │   ├── analytics.js        # Charts and spending analysis
│   │   └── settings.js         # App settings and data management
│   │
│   ├── utils/
│   │   ├── api.js              # Backend communication (REST + WebSocket)
│   │   ├── storage.js          # localStorage CRUD wrapper
│   │   ├── helpers.js          # Formatting, icons, debounce, JSON paths
│   │   ├── chart.js            # Canvas-based donut & bar charts
│   │   └── curl-parser.js      # Curl command → fetch config parser
│   │
│   ├── data/
│   │   └── sample-data.js      # Pre-loaded demo subscriptions
│   │
│   └── styles/
│       ├── index.css           # Global styles, CSS variables, resets
│       ├── sidebar.css         # Sidebar layout and collapse animation
│       ├── dashboard.css       # Summary cards, subscription grid
│       ├── integrate.css       # Step wizard, code editor, field mapper
│       ├── detail.css          # Detail modal content styling
│       ├── analytics.css       # Chart containers, category list
│       └── settings.css        # Settings cards, toggles, data actions
│
└── server/                     # ── BACKEND ──
    ├── main.py                 # FastAPI entry point, CORS, router mounting
    ├── requirements.txt        # Python dependencies
    │
    ├── routes/
    │   ├── __init__.py         # Package init
    │   ├── proxy.py            # POST /api/proxy — curl proxy via httpx
    │   └── scripts.py          # Script CRUD + WebSocket execution runner
    │
    └── scripts/
        ├── .gitkeep            # Placeholder for user-uploaded scripts
        ├── interakt.py         # Playwright: Interakt auth + wallet API
        ├── gallabox.py         # Playwright: Gallabox auth + account API
        └── istate.json         # Playwright session storage (Interakt)
```

---

## 8. File-by-File Breakdown

### Frontend Entry

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | 25 | HTML shell with `#app`, `#modal-root`, `#toast-root`. Loads Inter font, Vite entry point. |
| `vite.config.js` | 18 | Proxy config: `/api` → `http://localhost:8000`, `/ws` → `ws://localhost:8000`. |
| `src/main.js` | 84 | Hash router, theme initialization, sample data seeding, sidebar render, event listener. |

### Pages

| File | Lines | Key Functions |
|------|-------|---------------|
| `dashboard.js` | 217 | `renderDashboard()`, `renderSummary()`, `renderCards()`, `renderCard()`, search/filter, card click → `showDetail()`. |
| `integrate.js` | 884 | `renderIntegrate()`, multi-step wizard (Info → Curl/Script → Test/Run → Map → Save), `parseCurl`, terminal WS connection, JSON tree field mapping, custom field support, auto-detect. |
| `detail.js` | 219 | `showDetail(id)` — opens modal with full subscription info, field mappings, raw JSON, notes editor, refresh (re-executes curl), delete. |
| `analytics.js` | 220 | `renderAnalytics()` — donut chart (spending by category), bar chart (monthly cost), top subscriptions list, upcoming renewals, summary stats. |
| `settings.js` | 196 | `renderSettings()` — theme selection, default currency, backend health check, notification toggle, JSON export/import, data clear. |

### Components

| File | Lines | Key Functions |
|------|-------|---------------|
| `sidebar.js` | 94 | `renderSidebar()`, `updateActiveLink()`, `applyTheme()` — navigation, theme toggle, collapse. |
| `modal.js` | 82 | `openModal({title, body, footer, onClose})`, `closeModal()` — animated overlay with ESC/click-outside close. |
| `terminal.js` | 149 | `createTerminal(container)` — returns `{appendLine, setStatus, showInput, hideInput, clear}`. macOS-style terminal with input bar. |
| `toast.js` | 50 | `showToast(message, type, duration)` — animated notification. Types: success, error, warning, info. |

### Utilities

| File | Lines | Key Exports |
|------|-------|-------------|
| `api.js` | 126 | `executeCurl()`, `saveScript()`, `listScripts()`, `deleteScript()`, `runScript()`, `connectScriptWS()`, `checkBackendHealth()` |
| `storage.js` | 109 | `getSubscriptions()`, `saveSubscriptions()`, `addSubscription()`, `updateSubscription()`, `deleteSubscription()`, `getSettings()`, `saveSettings()`, `exportAllData()`, `importAllData()`, `clearAllData()`, `generateId()` |
| `helpers.js` | 160 | `formatDate()`, `formatCurrency()`, `daysUntil()`, `timeAgo()`, `resolvePath()`, `flattenPaths()`, `debounce()`, `getStatusFromDates()`, `icon()` (17 SVG icons) |
| `chart.js` | 121 | `drawDonutChart(canvas, data)`, `drawBarChart(canvas, data)` — canvas rendering with HiDPI support, CSS variable theming |
| `curl-parser.js` | 138 | `parseCurl(curlStr)` — tokenizer + flag parser for curl commands |

### Backend

| File | Lines | Key Functions |
|------|-------|---------------|
| `main.py` | 41 | FastAPI app creation, CORS setup, router mounting, health endpoint, Uvicorn runner. |
| `routes/proxy.py` | 63 | `proxy_request(req)` — async HTTP proxy using httpx. 30s timeout, SSL skip, redirect follow. |
| `routes/scripts.py` | 205 | `save_script()`, `list_scripts()`, `delete_script()`, `run_script()`, `script_websocket()` — full CRUD + WebSocket subprocess manager with stdin/stdout streaming. |
| `scripts/interakt.py` | 128 | Playwright automation: Interakt login → OTP → capture auth token → call wallet API → print `OUTPUT:` JSON. |
| `scripts/gallabox.py` | 110 | Playwright automation: Gallabox login → capture Bearer token → call `/api/me` → print `OUTPUT:` JSON. |

---

## 9. Data Model

### 9.1 Subscription Object

Stored as an array in `localStorage` under key `subtrack_subscriptions`:

```json
{
  "id": "xxxxxxxx-xxxx-4xxx-yxxx",
  "name": "Interakt",
  "logo": null,
  "category": "Marketing",
  "status": "active",
  "currency": "INR",
  "billingCycle": "credits",

  "credits": {
    "balance": 9950.63,
    "parkedBalance": 0.0,
    "totalBalance": 9950.63
  },

  "dates": {
    "startDate": "2026-02-24",
    "endDate": "2027-02-24",
    "nextRenewal": "2027-02-24",
    "lastRefreshed": "2026-04-14T08:30:00Z"
  },

  "cost": {
    "amount": 15000,
    "cycle": "yearly"
  },

  "integration": {
    "type": "playwright | curl | manual",
    "curlCommand": "curl -X GET ...",
    "fetchConfig": { "url": "...", "method": "GET", "headers": {}, "body": null },
    "scriptId": "interakt",
    "scriptContent": "import json ...",
    "fieldMapping": {
      "balance": "wallet_balance",
      "currency": "currency_code"
    },
    "autoRefreshInterval": 3600000,
    "lastResponse": { ... }
  },

  "customData": {
    "accountName": "My Business"
  },

  "notes": "WhatsApp Business API platform",
  "color": "#10B981",
  "createdAt": "2026-02-24T13:27:42Z",
  "updatedAt": "2026-04-14T08:30:00Z"
}
```

### 9.2 Settings Object

Stored in `localStorage` under key `subtrack_settings`:

```json
{
  "theme": "light | dark | system",
  "currency": "INR",
  "backendUrl": "http://localhost:8000",
  "notifications": false
}
```

---

## 10. Communication Protocols

### 10.1 REST API (Frontend → Backend)

| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| `GET` | `/api/health` | — | `{ status: "ok" }` |
| `POST` | `/api/proxy` | `{ url, method, headers, body }` | `{ success, status, headers, body }` |
| `POST` | `/api/scripts` | `{ id, content, filename? }` | `{ success, filename, path }` |
| `GET` | `/api/scripts` | — | `{ scripts: [{ filename, id, size }] }` |
| `DELETE` | `/api/scripts/{id}` | — | `{ success }` |
| `POST` | `/api/run-script` | `{ id }` | `{ success, execution_id, script_id }` |

### 10.2 WebSocket Protocol (Bidirectional)

**Endpoint**: `ws://localhost:8000/ws/script/{script_id}/{execution_id}`

**Server → Client Messages**:

| Type | Fields | When |
|------|--------|------|
| `status` | `message` | Script process started |
| `output` | `text`, `stream` ("stdout"/"stderr"), `needs_input` | Each line of output |
| `complete` | `return_code`, `result` (parsed JSON) | Script exited successfully |
| `error` | `message`, `return_code?`, `result?` | Script failed or timed out |

**Client → Server Messages**:

| Type | Fields | Purpose |
|------|--------|---------|
| `input` | `text` | Send text to script's stdin (e.g., OTP) |
| `kill` | — | Terminate the running script |

---

## 11. Development Workflow

### 11.1 Starting the App

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r server/requirements.txt

# Run both servers concurrently
npm run dev
# This executes: concurrently "vite" "python server/main.py"
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Vite proxies `/api` and `/ws` to the backend automatically.

### 11.2 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend (Vite) and backend (FastAPI) concurrently |
| `npm run dev:frontend` | Start only the Vite dev server |
| `npm run dev:backend` | Start only the Python backend |
| `npm run build` | Build production frontend bundle |
| `npm run preview` | Preview the production build |

### 11.3 Key Design Decisions

1. **No Database** — All data lives in `localStorage`. This is intentional for a lightweight, single-user tool. Export/import JSON for backups.

2. **No Frontend Framework** — Vanilla JS with manual DOM manipulation. Keeps the bundle tiny and avoids framework lock-in.

3. **Dual Integration Methods** — Method A (curl proxy) for simple API-key-based services. Method B (Playwright) for services requiring browser-based login/OTP. Method A is simpler and faster; Method B handles complex auth flows.

4. **WebSocket for Script I/O** — Enables real-time terminal output streaming and interactive input (OTP) without polling.

5. **Custom Canvas Charts** — No Chart.js or D3 dependency. Lightweight donut and bar chart rendering using the Canvas API.

6. **Field Mapping** — The JSON path resolver (`resolvePath`) enables users to map any nested API response field to subscription attributes, making the tool adaptable to any API shape.

---

*Last updated: April 2026*
