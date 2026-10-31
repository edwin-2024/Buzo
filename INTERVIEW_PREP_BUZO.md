# BUZO — Comprehensive Technical Interview Preparation Guide
**Candidate:** Edwin G | **Target Role:** Fresher Full-Stack Engineer (Infosys Campus Interview)  
**Project:** Buzo — Modern Bus Reservation, Live GPS Fleet Tracking & AI Assistant Platform  
**Primary Tech Stack:** React 19, TypeScript, Node.js, Express, Socket.io, PostgreSQL, Prisma ORM, Zod, Leaflet.js, Ollama/Groq/Gemini LLMs, Bun.

---

## 📑 Table of Contents
1. [Resume Claims Verification & Audit](#step-2-resume-claims-verification--audit)
2. [Section A: Project in 60 Seconds](#section-a-project-in-60-seconds)
3. [Section B: Architecture Map & System Flows](#section-b-architecture-map--system-flows)
4. [Section C: Deep Dives (10 Architectural Pillars)](#section-c-deep-dives-10-architectural-pillars)
5. [Section D: 22 High-Probability Interview Questions & Answers](#section-d-22-high-probability-interview-questions--answers)
6. [Section E: Tricky Follow-Ups & Defensive Handling](#section-e-tricky-follow-ups--defensive-handling)
7. [Section F: 10 Core Code Snippets to Write & Explain Live](#section-f-10-core-code-snippets-to-write--explain-live)
8. [Section G: Core Concepts & Architectural Glossary](#section-g-core-concepts--architectural-glossary)
9. [Section H: Honest Code Limitations & Future Improvements](#section-h-honest-code-limitations--future-improvements)
10. [Section I: Rapid-Fire 20-Question Blitz](#section-i-rapid-fire-20-question-blitz)

---

## STEP 2: RESUME CLAIMS VERIFICATION & AUDIT

### Bullet 1
> *"Architected a Turborepo monorepo with 3 independent frontends (Passenger, Driver, Admin) and a centralized Express backend, using Prisma ORM and Zod for type-safe concurrent seat reservation transactions"*

- **Verdict:** **SUPPORTED**
- **Evidence in Codebase:**
  - **Turborepo Monorepo:** Root [`package.json`](file:///d:/projects/Buzo/package.json#L21-L24) configures workspaces `apps/*` and `packages/*`. [`turbo.json`](file:///d:/projects/Buzo/turbo.json#L7-L37) defines build, lint, check-types, and dev execution pipelines with topological dependency hashing (`^build`).
  - **3 Independent Frontends:**
    - Passenger Web App: [`apps/web`](file:///d:/projects/Buzo/apps/web/package.json) running on port `5173`.
    - Driver Telemetry Cockpit: [`apps/driver`](file:///d:/projects/Buzo/apps/driver/package.json) running on port `5175`.
    - Admin Operations Portal: [`apps/admin`](file:///d:/projects/Buzo/apps/admin/package.json) running on port `5174`.
  - **Centralized Express Backend:** [`apps/api`](file:///d:/projects/Buzo/apps/api/src/server.ts) on port `5000` (`app.ts`).
  - **Prisma ORM:** [`packages/db/prisma/schema.prisma`](file:///d:/projects/Buzo/packages/db/prisma/schema.prisma) with complete relational schema (`User`, `Driver`, `Bus`, `Stop`, `Route`, `RouteStop`, `Trip`, `Seat`, `Booking`, `BusLocation`).
  - **Zod Validation:** [`apps/api/src/validation/booking.schema.ts`](file:///d:/projects/Buzo/apps/api/src/validation/booking.schema.ts) validates input with `.cuid()`, `.min(1)`, and custom `.refine()` preventing duplicate seat IDs. Evaluated at controller layer in [`booking.controller.ts`](file:///d:/projects/Buzo/apps/api/src/controllers/booking.controller.ts#L71) via `createBookingSchema.parse(req.body)`. Also [`packages/env/src/server.ts`](file:///d:/projects/Buzo/packages/env/src/server.ts) validates environment configuration at startup.
  - **Concurrency Handling & Double-Booking Prevention:**
    - **Interactive Transaction:** [`booking.repository.ts`](file:///d:/projects/Buzo/apps/api/src/repositories/booking.repository.ts#L53-L91) uses `prisma.$transaction(async (tx) => { ... })`.
    - **Atomic Conditional Mutation:** `tx.seat.updateMany({ where: { id: { in: seatIds }, status: SeatStatus.AVAILABLE }, data: { status: SeatStatus.BOOKED } })`.
    - **Row Count Invariant Check:** `if (updateResult.count !== seatIds.length) throw new Error("One or more selected seats are no longer available")`.
    - **Database-Level Unique Constraints:** [`schema.prisma`](file:///d:/projects/Buzo/packages/db/prisma/schema.prisma#L149-L159) defines `seatId String @unique` on `Booking` and `@@unique([tripId, seatNumber])` on `Seat`.
- **Nuance / Honest Distinction:**
  The workspace has a placeholder package [`packages/validators`](file:///d:/projects/Buzo/packages/validators/index.ts) initialized via Bun, but all active runtime Zod schemas are centrally organized within [`apps/api/src/validation/`](file:///d:/projects/Buzo/apps/api/src/validation/). Mention this transparently: *"I centralized the HTTP schema validations inside `apps/api/src/validation` for direct co-location with API controllers, while `packages/env` handles shared config validation."*

---

### Bullet 2
> *"Engineered bi-directional real-time GPS tracking using Socket.io and Leaflet.js, broadcasting live driver coordinates to passengers with low-latency WebSocket connections"*

- **Verdict:** **SUPPORTED**
- **Evidence in Codebase:**
  - **Socket.io Server:** [`apps/api/src/realtime/socket.ts`](file:///d:/projects/Buzo/apps/api/src/realtime/socket.ts) and [`bus.socket.ts`](file:///d:/projects/Buzo/apps/api/src/realtime/bus.socket.ts) initialize WebSocket event handling with room-based pub/sub.
  - **Room Isolation:** Clients join bus-specific rooms using `socket.on("bus:join", (busId) => socket.join(busId))`.
  - **Driver Coordinate Broadcast:**
    - Driver updates coordinates via HTTP PATCH [`bus-location.controller.ts`](file:///d:/projects/Buzo/apps/api/src/controllers/bus-location.controller.ts) which triggers [`bus-location.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/bus-location.service.ts#L28-L41):
      1. Upserts GPS coordinates in Postgres via `busLocationRepository.upsert(...)`.
      2. Emits isolated telemetry to subscribed passengers: `getIO().to(busId).emit("bus:location", location)`.
      3. Emits global telemetry to admin radar: `getIO().emit("bus-location-update", ...)`.
    - Alternatively, [`bus.socket.ts`](file:///d:/projects/Buzo/apps/api/src/realtime/bus.socket.ts#L35-L55) handles raw socket listener `socket.on("busLocationUpdate")`.
  - **Leaflet Visualizations:**
    - Passenger App: [`apps/web/src/pages/track.tsx`](file:///d:/projects/Buzo/apps/web/src/pages/track.tsx) renders Leaflet `MapContainer`, `TileLayer`, `Polyline` for route path, custom HTML `divIcon` pulsing markers, and automated camera tracking with dynamic Haversine ETA.
    - Admin Portal: [`apps/admin/src/pages/live-map.tsx`](file:///d:/projects/Buzo/apps/admin/src/pages/live-map.tsx) renders multi-coach fleet radar tracking active vehicles, heading orientation, speeds, and status markers.
  - **Bi-directional Nature:** Passengers emit subscription intents (`bus:join`, `bus:leave`) and receive coordinate streams; drivers broadcast delay alerts (`bus:delay`), rest-break statuses (`bus:break`), and receive trip acknowledgments.

---

### Bullet 3
> *"Built a custom AI chatbot using Ollama with function-calling to fetch live weather, search routes, and execute seat bookings autonomously; secured with JWT and RBAC"*

- **Verdict:** **PARTIALLY SUPPORTED (with a critical distinction you must explain)**
- **Evidence in Codebase:**
  - **LLM Tool Calling & Autonomy:**
    - [`packages/chatbot/src/client.ts`](file:///d:/projects/Buzo/packages/chatbot/src/client.ts#L157-L206) supports local Ollama (`qwen3:4b-instruct-2507-q4_K_M`), Groq (`qwen/qwen3.8-27b`), and Gemini (`gemini-2.5-flash-lite`).
    - Tool definitions in [`packages/chatbot/src/tools/registry.ts`](file:///d:/projects/Buzo/packages/chatbot/src/tools/registry.ts) define 8 structured tools: `searchTrips`, `trackBus`, `checkSeats`, `bookSeat`, `listRoutes`, `listStops`, `getDestinationWeather`, `getTravelTips`.
    - Live Weather: [`apps/api/src/chat/handlers/getDestinationWeather.handler.ts`](file:///d:/projects/Buzo/apps/api/src/chat/handlers/getDestinationWeather.handler.ts) fetches live conditions from Open-Meteo REST API using city geocoding and fallback stop coordinates.
    - Route Search: [`searchTrips.handler.ts`](file:///d:/projects/Buzo/apps/api/src/chat/handlers/searchTrips.handler.ts) queries routes using fuzzy Levenshtein distance matching.
    - Autonomous Booking: [`bookSeat.handler.ts`](file:///d:/projects/Buzo/apps/api/src/chat/handlers/bookSeat.handler.ts) handles position preferences ("front", "middle", "back") and consecutive side-by-side seating, executing real bookings through `bookingService.create(...)`.
  - **Security (JWT vs RBAC):**
    - **JWT Authentication:** SUPPORTED. Chat route [`apps/api/src/routes/chat.routes.ts`](file:///d:/projects/Buzo/apps/api/src/routes/chat.routes.ts) runs `optionalAuthMiddleware`. In [`bookSeat.handler.ts`](file:///d:/projects/Buzo/apps/api/src/chat/handlers/bookSeat.handler.ts#L8-L10), the system validates:
      `if (!userId) throw new Error("Authentication required. Please log in to book seats.");`
    - **RBAC:** PARTIALLY SUPPORTED on the chatbot specifically. Role-Based Access Control (`requireRole("ADMIN")`, `requireRole("DRIVER", "ADMIN")`) is heavily enforced across all administrative and operational REST endpoints in [`apps/api/src/routes/`](file:///d:/projects/Buzo/apps/api/src/routes/). However, the chatbot route does *not* restrict access based on roles because chatting and booking is available to all authenticated passengers.
- **How to Answer Honestly:**
  *"The chatbot uses JWT authentication via our bearer token middleware to verify the passenger's identity before executing sensitive tools like `bookSeat`. RBAC via `requireRole` middleware is actively enforced across our administrative and driver management REST APIs (buses, trips, routes, driver assignments). The chatbot itself is public-facing for inquiries, while booking actions strictly require an authenticated passenger session."*

---

### High-Impact Code Features NOT on Your Resume (Use These to Impress!)
1. **Dynamic Tiered Seat Pricing Engine:** [`apps/api/src/lib/seat-pricing.ts`](file:///d:/projects/Buzo/apps/api/src/lib/seat-pricing.ts) categorizes seats into 4 distinct pricing tiers (`PREMIUM_FRONT_WINDOW` at ₹749, `PREMIUM_FRONT_AISLE` at ₹699, `STANDARD_WINDOW` at ₹649, `STANDARD_AISLE` at ₹599) with perks like extra legroom and priority deboarding.
2. **On-the-Fly Binary PDF Ticket Generator:** [`apps/api/src/services/receipt.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/receipt.service.ts) implements a custom `PdfStreamBuilder` that synthesizes raw `%PDF-1.4` binary streams without heavyweight third-party libraries, serving dynamic downloads at `GET /api/bookings/:id/receipt`.
3. **Driver Operational State Protocol:** [`apps/api/src/realtime/bus.socket.ts`](file:///d:/projects/Buzo/apps/api/src/realtime/bus.socket.ts#L57-L85) supports real-time driver rest-break toggling (`bus:break`) and route delay announcements (`bus:delay`), rendering amber paused markers and recalculating passenger ETAs.
4. **Fuzzy Levenshtein Route Search:** [`apps/api/src/services/trip.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/trip.service.ts#L114-L150) uses a dynamic programming matrix allowing up to 3 typos and parses relative dates ("today", "tomorrow", "day after tomorrow").
5. **SSE Streaming Chatbot:** Chat responses stream chunk-by-chunk over HTTP Server-Sent Events (`text/event-stream`), supporting tool payload delivery alongside natural text.
6. **Automated Unit & Integration Test Suite:** 36 automated tests across 5 suites in [`apps/api/test`](file:///d:/projects/Buzo/apps/api/test/) executing under Bun test runner in under 10 seconds.

---

## SECTION A: PROJECT IN 60 SECONDS

> **Script to Deliver Out Loud (Speak with calm confidence, natural pacing):**
>
> "Buzo is a full-stack bus reservation and live fleet tracking platform that solves the uncertainty passengers face when booking intercity buses and waiting at transit stops.
>
> I structured it as a TypeScript monorepo using Turborepo with three dedicated frontends: a passenger web portal for visual seat selection, a driver cockpit app for GPS telemetry simulation and operational alerts, and an administrative command center for fleet and trip management.
>
> On the backend, I built an Express and PostgreSQL service powered by Prisma ORM. For seat reservations, I solved the double-booking problem by combining atomic conditional updates inside Prisma transactions with database-level unique constraints.
>
> For real-time tracking, I integrated Socket.io rooms with Leaflet.js maps, enabling drivers to stream coordinates, traffic delays, and rest-break statuses with sub-second latency.
>
> Finally, I integrated an autonomous AI chatbot supporting local Ollama models and cloud LLMs via structured tool calling, allowing passengers to check live weather, search routes, and book seats conversationally.
>
> What I'm most proud of is the end-to-end type safety across the monorepo and how the system remains resilient under concurrent booking requests."

---

## SECTION B: ARCHITECTURE MAP & SYSTEM FLOWS

### Monorepo Structure

```text
Buzo/
├── apps/
│   ├── web/               # Passenger App (React 19 + Vite + Tailwind + Leaflet) -> Port 5173
│   ├── driver/            # Driver Cockpit (Telemetry Broadcast + Break HUD)     -> Port 5175
│   ├── admin/             # Operations Portal (Fleet Radar + CRUD Management)     -> Port 5174
│   └── api/               # Centralized Express Backend + Socket.io Server       -> Port 5000
│       ├── src/
│       │   ├── chat/      # LLM Tool Handlers (Weather, Booking, Search)
│       │   ├── controllers/ # HTTP Request Handlers (Validation Parsing)
│       │   ├── middleware/  # JWT Auth, RBAC, Centralized Error Handling
│       │   ├── realtime/    # Socket.io Initialization & Bus Rooms
│       │   ├── repositories/# Prisma Data Access Layer
│       │   ├── routes/      # Express Router Declarations
│       │   ├── services/    # Business Logic (Transactions, PDF, Pricing)
│       │   └── validation/  # Zod Input Schemas
│       └── test/          # Bun Automated Integration & Unit Tests
├── packages/
│   ├── db/                # Prisma Schema, Migrations & Generated Client
│   ├── env/               # Zod Environment Variable Validator
│   ├── chatbot/           # LLM Multi-Provider Engine (Ollama, Groq, Gemini)
│   ├── ui/                # Shared UI Components (shadcn/ui primitives)
│   ├── typescript-config/ # Shared Base & App tsconfig.json files
│   └── eslint-config/     # Shared Linting Rules
├── turbo.json             # Turborepo Pipeline Orchestration
└── package.json           # Monorepo Workspace Configuration (Bun Package Manager)
```

### Full System Text Diagram

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                        |
|  +--------------------+   +-----------------------+   +----------------------------+  |
|  |   Passenger Web    |   |    Driver Cockpit     |   |       Admin Portal         |  |
|  |  (React 19 / Vite) |   |  (React 19 / Vite)    |   |    (React 19 / Vite)       |  |
|  |  - Seat Picker UI  |   |  - GPS Simulation HUD |   |    - Fleet Radar Map       |  |
|  |  - Leaflet Map     |   |  - Break/Delay Toggles|   |    - CRUD Routes & Trips   |  |
|  |  - Chatbot Widget  |   |  - Telemetry Loop     |   |    - Analytics Dashboard   |  |
|  +---------+----------+   +-----------+-----------+   +--------------+-------------+  |
+------------|--------------------------|------------------------------|----------------+
             | REST / SSE               | HTTP / WS                    | REST / WS
             |                          |                              |
+------------v--------------------------v------------------------------v----------------+
|                                  API GATEWAY TIER                                     |
|                               (Node.js / Express 5000)                                |
|                                                                                       |
|  +--------------------+   +-----------------------+   +----------------------------+  |
|  |  authMiddleware    |   |  requireRole("ADMIN") |   |   Centralized errorHandler |  |
|  |  (JWT Verification)|   |  (RBAC Permission)    |   |   (Zod 400, Prisma P2002 409)  |  |
|  +--------------------+   +-----------------------+   +----------------------------+  |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |                                Express Controllers                              |  |
|  |   authController | bookingController | tripController | busLocationController   |  |
|  +---------------------------------------------------------------------------------+  |
|                                          |                                            |
|  +---------------------------------------v-----------------------------------------+  |
|  |                             Service Layer Logic                                 |  |
|  |   bookingService | tripService (Fuzzy Match) | receiptService | busLocation     |  |
|  +---------------------------------------------------------------------------------+  |
|             |                                                  |                      |
|             | Socket.io Room Broadcast                         | Prisma Transactions  |
|  +----------v--------------------------+            +----------v-------------------+  |
|  |   Socket.io Realtime Engine         |            |     Data Repository Layer    |  |
|  |   - bus:join / bus:leave rooms      |            |  - Atomic Seat UpdateMany    |  |
|  |   - bus:location & bus:delay emit   |            |  - Unique Constraints P2002  |  |
|  +-------------------------------------+            +------------------------------+  |
+----------------------------------------------------------------|----------------------+
                                                                 |
                                              +------------------+------------------+
                                              |                                     |
                                  +-----------v-----------+             +-----------v-----------+
                                  |   PostgreSQL / Neon   |             |   LLM Providers       |
                                  |   - Users & Drivers   |             |   - Ollama (Local)    |
                                  |   - Trips & Routes    |             |   - Groq (Cloud Qwen) |
                                  |   - Seats & Bookings  |             |   - Gemini 2.5 Flash  |
                                  |   - BusLocations      |             |   - Open-Meteo Weather|
                                  +-----------------------+             +-----------------------+
```

---

### Step-by-Step System Flow Walkthroughs

#### Flow 1: User Logs In and Gets a Token
1. **User action:** Passenger inputs email and password on the login screen ([`apps/web/src/pages/login.tsx`](file:///d:/projects/Buzo/apps/web/src/pages/login.tsx)).
2. **HTTP Dispatch:** Form submission triggers `POST http://localhost:5000/api/auth/login`.
3. **Route Handling:** Handled by [`auth.routes.ts`](file:///d:/projects/Buzo/apps/api/src/routes/auth.routes.ts#L10) routing to `authController.login`.
4. **Zod Validation:** [`auth.controller.ts`](file:///d:/projects/Buzo/apps/api/src/controllers/auth.controller.ts#L32) parses payload with `loginSchema.parse(req.body)`.
5. **Credential Verification:** [`auth.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/auth.service.ts#L42-L69) queries `userRepository.findByEmail`. It verifies password using `bcrypt.compare` via `verifyPassword` ([`password.ts`](file:///d:/projects/Buzo/apps/api/src/lib/password.ts#L11)).
6. **Token Generation:** [`jwt.ts`](file:///d:/projects/Buzo/apps/api/src/lib/jwt.ts#L13-L17) signs a JWT containing `{ userId, role }` signed with `JWT_SECRET` (expiring in 7 days).
7. **Client Persistence:** Frontend receives `{ user, token }` and calls `useAuthStore.getState().login(user, token)` ([`auth.store.ts`](file:///d:/projects/Buzo/apps/web/src/stores/auth.store.ts#L25)), persisting into browser `localStorage`. Axios interceptor attaches `Authorization: Bearer <token>` to subsequent requests ([`apps/web/src/lib/axios.ts`](file:///d:/projects/Buzo/apps/web/src/lib/axios.ts)).

#### Flow 2: Passenger Searches and Books a Seat
1. **Search & Fuzzy Match:** Passenger queries "Bangalore" to "Chennai" for "tomorrow". [`trip.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/trip.service.ts#L152-L193) executes Levenshtein distance fuzzy matching on stops and ensures `originIndex < destinationIndex`.
2. **Seat Selection:** Passenger navigates to [`apps/web/src/pages/booking.tsx`](file:///d:/projects/Buzo/apps/web/src/pages/booking.tsx), clicking Seat #4 (Window). UI calculates tier price (₹749) via `resolveSeatPricing`.
3. **Reservation Request:** Passenger clicks "Proceed". React Query mutation sends `POST /api/bookings` with `{ tripId, seatIds: ["cuid-seat-4"] }`.
4. **Middleware & Validation:** Request passes through `authMiddleware` verifying Bearer JWT. [`booking.controller.ts`](file:///d:/projects/Buzo/apps/api/src/controllers/booking.controller.ts#L71) validates input via `createBookingSchema.parse(req.body)`.
5. **Interactive Transaction:** [`booking.repository.ts`](file:///d:/projects/Buzo/apps/api/src/repositories/booking.repository.ts#L53-L91) starts `prisma.$transaction(async (tx) => { ... })`:
   - Runs `tx.seat.updateMany({ where: { id: { in: seatIds }, status: "AVAILABLE" }, data: { status: "BOOKED" } })`.
   - Validates that returned `count === seatIds.length`.
   - Creates booking record in `tx.booking.create` with `paymentStatus: "PENDING"`.
6. **Checkout Simulation:** Frontend redirects to [`payment.tsx`](file:///d:/projects/Buzo/apps/web/src/pages/payment.tsx). On submit, `POST /api/payments/create-checkout-session` updates booking `paymentStatus` to `"PAID"`. Passenger can immediately download the custom binary PDF ticket via `GET /api/bookings/:id/receipt`.

#### Flow 3: Driver Sends Location & Passenger Sees Bus Move
1. **Simulation Interval:** Driver starts assigned route in [`apps/driver/src/pages/dashboard.tsx`](file:///d:/projects/Buzo/apps/driver/src/pages/dashboard.tsx#L157-L220). An interval ticks every 1,000ms, linearly interpolating GPS coordinates between waypoints at 60 km/h.
2. **Telemetry Transmit:** Driver app dispatches `PATCH /api/buses/:busId/location` with `{ latitude, longitude, heading, speed }`.
3. **Database Upsert & Emission:** [`bus-location.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/bus-location.service.ts#L20-L41):
   - Upserts latest telemetry into `BusLocation` Postgres table.
   - Dispatches socket event to the bus room: `getIO().to(busId).emit("bus:location", location)`.
   - Dispatches fleet radar event: `getIO().emit("bus-location-update", ...)`.
4. **Passenger Room Subscription:** Passenger tracking screen [`apps/web/src/pages/track.tsx`](file:///d:/projects/Buzo/apps/web/src/pages/track.tsx#L235) has joined room `trip.busId` via `socket.emit("bus:join", trip.busId)`.
5. **Map Animation:** Passenger socket receives `"bus:location"`. State update triggers Leaflet `Marker` repositioning. Custom `MapController` pans smoothly, and the Haversine formula recalculates distance and ETA to the next stop.

#### Flow 4: User Asks Chatbot to Book a Seat
1. **User Prompt:** User opens [`ChatbotWidget`](file:///d:/projects/Buzo/apps/web/src/components/chatbot/widget.tsx) and types: *"Book 2 seats near the front from Majestic to Electronic City for tomorrow"*.
2. **SSE Request:** Browser opens a POST request to `/api/chat` passing message history and Bearer JWT.
3. **Controller Execution:** [`chat.controller.ts`](file:///d:/projects/Buzo/apps/api/src/controllers/chat.controller.ts) sets headers `Content-Type: text/event-stream`.
4. **LLM Function Calling:** [`packages/chatbot/src/execute.ts`](file:///d:/projects/Buzo/packages/chatbot/src/execute.ts) sends tool definitions to Ollama/Groq/Gemini. The model selects tool `bookSeat` with arguments `{ origin: "Majestic", destination: "Electronic City", numberOfSeats: 2, position: "front", sideBySide: true }`.
5. **Autonomous Tool Execution:** [`bookSeat.handler.ts`](file:///d:/projects/Buzo/apps/api/src/chat/handlers/bookSeat.handler.ts) verifies passenger `userId`. It finds available seats in front rows, filters for adjacent consecutive numbers, and calls `bookingService.create(userId, { tripId, seatIds })`.
6. **Streaming Response:** Tool execution output is fed back into `generateResponseStream`, streaming a friendly confirmation to the user chunk-by-chunk while rendering interactive reservation cards in the chat UI.

---

## SECTION C: DEEP DIVES (10 ARCHITECTURAL PILLARS)

### 1. Monorepo Setup (Turborepo & Bun)
- **What & Why:** Monorepos host multiple applications and libraries in one repository. Turborepo provides smart dependency graphing and caching so tasks that haven't changed are never rebuilt. Bun acts as an ultra-fast JavaScript runtime, bundler, and package manager.
- **Everyday Analogy:** Think of an airline hangar where the passenger planes, cargo carriers, and maintenance trucks share the same central fuel pipeline and spare parts warehouse instead of separate factories.
- **Exact Files:** Root [`package.json`](file:///d:/projects/Buzo/package.json), [`turbo.json`](file:///d:/projects/Buzo/turbo.json).
- **Code Snippet:**
  ```json
  // turbo.json
  {
    "$schema": "https://turborepo.dev/schema.json",
    "tasks": {
      "build": {
        "dependsOn": ["^build"],
        "inputs": ["$TURBO_DEFAULT$", ".env*"],
        "outputs": ["dist/**"]
      },
      "dev": {
        "cache": false,
        "persistent": true
      }
    }
  }
  ```
- **Line-by-Line Breakdown:**
  - `"dependsOn": ["^build"]`: Topological build ordering; Turborepo guarantees shared dependencies in `packages/*` are built before consumer `apps/*`.
  - `"inputs": ["$TURBO_DEFAULT$", ".env*"]`: Turbo hashes source files and environment files to create a fingerprint cache key.
  - `"cache": false, "persistent": true`: Tells Turbo dev watchers run continuously without caching background processes.
- **Trade-offs & Alternatives:**
  - *Trade-off:* Larger initial git clone size; requires strict internal dependency discipline.
  - *Alternative:* Multi-repo setup with published npm packages (high overhead for a solo fresher project).

---

### 2. Database Schema & Prisma ORM
- **What & Why:** Prisma provides a type-safe object-relational mapping (ORM) layer over PostgreSQL, preventing SQL injection and auto-generating TypeScript interfaces.
- **Everyday Analogy:** A multilingual translator between your TypeScript code and PostgreSQL tables that enforces contracts so typos can't compile.
- **Exact Files:** [`packages/db/prisma/schema.prisma`](file:///d:/projects/Buzo/packages/db/prisma/schema.prisma), [`packages/db/src/client.ts`](file:///d:/projects/Buzo/packages/db/src/client.ts).
- **Code Snippet:**
  ```prisma
  model Seat {
    id         String     @id @default(cuid())
    tripId     String
    seatNumber Int
    status     SeatStatus @default(AVAILABLE)
    trip       Trip       @relation(fields: [tripId], references: [id])
    booking    Booking?

    @@unique([tripId, seatNumber])
  }

  model Booking {
    id            String        @id @default(cuid())
    tripId        String
    passengerId   String
    seatId        String        @unique
    paymentStatus PaymentStatus @default(PENDING)
    seat          Seat          @relation(fields: [seatId], references: [id])
  }
  ```
- **Line-by-Line Breakdown:**
  - `@@unique([tripId, seatNumber])`: Composite index guaranteeing a bus cannot have duplicate seat numbers on the same trip.
  - `seatId String @unique`: High-stakes constraint ensuring a physical seat record can belong to at most one booking in the entire database.
  - `@default(cuid())`: Collision-resistant unique identifier safe for distributed database horizontal scaling.
- **Trade-offs & Alternatives:**
  - *Trade-off:* Prisma query generator has minor overhead compared to raw SQL queries.
  - *Alternative:* Drizzle ORM (lighter weight) or raw `pg` library.

---

### 3. Zod Request & Environment Validation
- **What & Why:** Prevents corrupt data, prototype pollution, or runtime crashes by validating incoming HTTP request bodies and environment configs at the API perimeter.
- **Everyday Analogy:** Airport security scanning luggage before passengers can board the flight.
- **Exact Files:** [`apps/api/src/validation/booking.schema.ts`](file:///d:/projects/Buzo/apps/api/src/validation/booking.schema.ts), [`packages/env/src/server.ts`](file:///d:/projects/Buzo/packages/env/src/server.ts).
- **Code Snippet:**
  ```typescript
  // apps/api/src/validation/booking.schema.ts
  export const createBookingSchema = z.object({
    tripId: z.string().cuid(),
    seatIds: z
      .array(z.string().cuid())
      .min(1)
      .refine(
        (items) => new Set(items).size === items.length,
        { message: "Duplicate seat IDs are not allowed" }
      ),
  });
  export type CreateBookingInput = z.infer<typeof createBookingSchema>;
  ```
- **Line-by-Line Breakdown:**
  - `tripId: z.string().cuid()`: Ensures the trip identifier matches a valid CUID format before touching the database.
  - `.array(...).min(1)`: Mandates booking at least one seat per transaction.
  - `new Set(items).size === items.length`: Custom refinement ensuring users cannot send `["seatA", "seatA"]` to exploit reservation logic.
- **Trade-offs & Alternatives:**
  - *Trade-off:* Small CPU parsing overhead per request.
  - *Alternative:* Joi, Yup, or manual `if/else` assertions.

---

### 4. JWT Authentication
- **What & Why:** Stateless token-based authentication allowing backend microservices and REST endpoints to verify identity without database session lookups.
- **Everyday Analogy:** A stamped entry wristband at a music festival: security checks the stamp signature instead of calling headquarters every time you re-enter.
- **Exact Files:** [`apps/api/src/lib/jwt.ts`](file:///d:/projects/Buzo/apps/api/src/lib/jwt.ts), [`apps/api/src/middleware/auth.middleware.ts`](file:///d:/projects/Buzo/apps/api/src/middleware/auth.middleware.ts).
- **Code Snippet:**
  ```typescript
  // apps/api/src/middleware/auth.middleware.ts
  export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Invalid authorization header" });
      }
      const token = authHeader.split(" ")[1];
      const payload = verifyToken(token);

      if (tokenRevocationService.isRevoked(token, payload)) {
        return res.status(401).json({ message: "Token has been revoked or invalidated. Please log in again." });
      }

      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
  ```
- **Line-by-Line Breakdown:**
  - `req.headers.authorization`: Extracts standard HTTP Authorization header.
  - `verifyToken(token)`: Validates HMAC-SHA256 signature using `JWT_SECRET`; throws if expired or tampered with.
  - `req.user = payload`: Injects typed user identity into Express request object for downstream controllers.
- **Trade-offs & Alternatives:**
  - *Trade-off:* Cannot invalidate a compromised token immediately unless a blacklist (Redis) or short expiry is introduced.
  - *Alternative:* Stateful session cookies with Redis.

---

### 5. Role-Based Access Control (RBAC)
- **What & Why:** Restricts sensitive operations (adding buses, deleting trips) strictly to authorized user roles (`ADMIN`, `DRIVER`, `PASSENGER`).
- **Everyday Analogy:** Keycard access in a hospital: visitors enter patient rooms, but only licensed surgeons can open operating theater doors.
- **Exact Files:** [`apps/api/src/middleware/role.middleware.ts`](file:///d:/projects/Buzo/apps/api/src/middleware/role.middleware.ts), [`apps/api/src/routes/bus.routes.ts`](file:///d:/projects/Buzo/apps/api/src/routes/bus.routes.ts).
- **Code Snippet:**
  ```typescript
  // apps/api/src/middleware/role.middleware.ts
  export function requireRole(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      next();
    };
  }
  ```
- **Line-by-Line Breakdown:**
  - `...roles: UserRole[]`: Higher-order factory function accepting authorized role parameters.
  - `!req.user`: Returns 401 Unauthorized if authentication middleware was bypassed.
  - `!roles.includes(req.user.role)`: Returns 403 Forbidden if user is authenticated but unauthorized.
- **Trade-offs & Alternatives:**
  - *Trade-off:* Static role enumerations lack fine-grained attribute-based permissions (ABAC).
  - *Alternative:* Casbin or ABAC policies.

---

### 6. Seat Reservation Logic & Concurrency Control
- **What & Why:** Prevents two users booking the identical seat simultaneously under high network concurrency.
- **Everyday Analogy:** Two people trying to withdraw the last ₹500 from an ATM at the exact same split-second.
- **Exact Files:** [`apps/api/src/repositories/booking.repository.ts`](file:///d:/projects/Buzo/apps/api/src/repositories/booking.repository.ts#L49-L92).
- **Code Snippet:**
  ```typescript
  // apps/api/src/repositories/booking.repository.ts
  return prisma.$transaction(async (tx) => {
    const updateResult = await tx.seat.updateMany({
      where: {
        id: { in: seatIds },
        status: SeatStatus.AVAILABLE,
      },
      data: { status: SeatStatus.BOOKED },
    });

    if (updateResult.count !== seatIds.length) {
      throw new Error("One or more selected seats are no longer available");
    }

    const bookings = [];
    for (const seatId of seatIds) {
      const booking = await tx.booking.create({
        data: { ...data, seat: { connect: { id: seatId } } },
      });
      bookings.push(booking);
    }
    return bookings;
  }, { maxWait: 10000, timeout: 30000 });
  ```
- **Line-by-Line Breakdown:**
  - `prisma.$transaction(async (tx) => { ... })`: Runs inside a single PostgreSQL database transaction.
  - `tx.seat.updateMany`: Issues an atomic `UPDATE` with a predicate check `status = 'AVAILABLE'`. In Postgres, this acquires write locks on the target rows.
  - `updateResult.count !== seatIds.length`: The second transaction sees 0 matched rows because the first transaction already set them to `BOOKED`. It throws an error, aborting the transaction and triggering rollback.
  - Double Protection: `seatId String @unique` on `Booking` model guarantees database hardware rejects duplicate inserts even if app logic fails.
- **Trade-offs & Alternatives:**
  - *Trade-off:* Database-level locking can experience contention under thousands of bookings/sec on a single trip.
  - *Alternative:* Distributed Redis locks (`Redlock`) with seat reservation TTL expiry.

---

### 7. Socket.io Live Tracking & Room Isolation
- **What & Why:** Replaces heavy HTTP polling with continuous WebSocket connections, broadcasting GPS coordinates only to passengers interested in a specific bus.
- **Everyday Analogy:** Instead of calling the bus driver every 5 seconds asking "where are you?", you tune into a specific walkie-talkie radio channel.
- **Exact Files:** [`apps/api/src/realtime/socket.ts`](file:///d:/projects/Buzo/apps/api/src/realtime/socket.ts), [`apps/api/src/realtime/bus.socket.ts`](file:///d:/projects/Buzo/apps/api/src/realtime/bus.socket.ts).
- **Code Snippet:**
  ```typescript
  // apps/api/src/realtime/bus.socket.ts
  export function registerBusSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
      socket.on("bus:join", (busId: string) => {
        socket.join(busId);
      });
      socket.on("bus:leave", (busId: string) => {
        socket.leave(busId);
      });
    });
  }
  ```
- **Line-by-Line Breakdown:**
  - `socket.join(busId)`: Enrolls the client socket into an isolated pub/sub room named after the bus ID.
  - Server broadcasts using `io.to(busId).emit("bus:location", location)`, consuming zero network bandwidth for passengers tracking different routes.
  - `socket.leave(busId)`: Cleans up memory when passengers navigate away from tracking screens.
- **Trade-offs & Alternatives:**
  - *Trade-off:* Server memory scales with active socket connections.
  - *Alternative:* Server-Sent Events (SSE) or MQTT.

---

### 8. Interactive Leaflet Map Visualizations
- **What & Why:** Open-source map rendering engine providing vector paths, live vehicle markers, and automated camera tracking without Google Maps API licensing costs.
- **Everyday Analogy:** A interactive digital roadmap overlay with an automated GPS pin that glides between bus stops.
- **Exact Files:** [`apps/web/src/pages/track.tsx`](file:///d:/projects/Buzo/apps/web/src/pages/track.tsx#L35-L169).
- **Code Snippet:**
  ```typescript
  // apps/web/src/pages/track.tsx
  function MapController({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      map.panTo(center, { animate: true, duration: 1 });
    }, [center, map]);
    return null;
  }
  ```
- **Line-by-Line Breakdown:**
  - `useMap()`: React Leaflet hook providing access to the underlying Leaflet DOM map instance.
  - `map.panTo(center, { animate: true, duration: 1 })`: Smoothly glides the camera viewport when new driver GPS coordinates arrive.
  - Custom `L.divIcon`: Renders animated HTML/CSS pulsing rings indicating live satellite reception.
- **Trade-offs & Alternatives:**
  - *Trade-off:* Leaflet is 2D raster/tile-based; does not natively support 3D terrain buildings like Mapbox GL.
  - *Alternative:* Mapbox GL JS or Google Maps JavaScript API.

---

### 9. Chatbot with Multi-Provider Tool Calling (Ollama / Groq / Gemini)
- **What & Why:** Empowers LLMs to fetch real-world data and execute actions rather than merely generating static hallucinated text.
- **Everyday Analogy:** Giving an AI assistant a phone and a company credit card with specific instructions on how to call APIs and book tickets.
- **Exact Files:** [`packages/chatbot/src/client.ts`](file:///d:/projects/Buzo/packages/chatbot/src/client.ts), [`apps/api/src/services/chat.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/chat.service.ts).
- **Code Snippet:**
  ```typescript
  // apps/api/src/services/chat.service.ts
  export class ChatService {
    async chat(message: string, history?: any[], userId?: string) {
      const action = await execute(message, history);

      if (action.type === "text") {
        return { stream: textStream(action.text) };
      }

      const handler = toolHandlers[action.name];
      const result = await handler(action.arguments, userId);
      const stream = generateResponseStream(message, result);

      return { tool: action.name, data: result, stream };
    }
  }
  ```
- **Line-by-Line Breakdown:**
  - `execute(message, history)`: Prompts the LLM with structured JSON tool schemas.
  - `action.type === "function"`: If the model determines it needs external data, it returns tool parameters instead of prose.
  - `handler(action.arguments, userId)`: Securely invokes backend business logic with passenger authorization.
  - `generateResponseStream(...)`: Streams the final human-readable summary over Server-Sent Events.
- **Trade-offs & Alternatives:**
  - *Trade-off:* Dependent on LLM parameter extraction accuracy.
  - *Alternative:* Intent classification with traditional rule-based dialog trees (e.g., Rasa).

---

### 10. Client State Management with Zustand
- **What & Why:** Lightweight, hook-based state management that eliminates boilerplate compared to Redux while supporting automatic browser persistence.
- **Everyday Analogy:** A shared whiteboard in the office lobby that any employee can glance at or update instantly without filling out paperwork.
- **Exact Files:** [`apps/web/src/stores/auth.store.ts`](file:///d:/projects/Buzo/apps/web/src/stores/auth.store.ts).
- **Code Snippet:**
  ```typescript
  // apps/web/src/stores/auth.store.ts
  export const useAuthStore = create<AuthState>()(
    persist(
      (set) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        login: (user, token) => set({ user, token, isAuthenticated: true }),
        logout: () => set({ user: null, token: null, isAuthenticated: false }),
      }),
      { name: "buzo-passenger-auth" }
    )
  );
  ```
- **Line-by-Line Breakdown:**
  - `create<AuthState>()`: Instantiates a typed store with zero React Context provider wrappers.
  - `persist(...)`: Zustand middleware automatically syncing state changes to `window.localStorage`.
  - Selective re-renders: Components subscribing via `const user = useAuthStore(s => s.user)` only re-render when the user object changes.
- **Trade-offs & Alternatives:**
  - *Trade-off:* Unsuitable for complex action time-travel debugging without devtools middleware.
  - *Alternative:* Redux Toolkit or React Context API.

---

## SECTION D: 22 HIGH-PROBABILITY INTERVIEW QUESTIONS & ANSWERS

### Overview & Architecture
#### Q1: Can you explain the high-level architecture of Buzo?
> *"I designed Buzo as a full-stack Turborepo monorepo with clean separation of concerns. The frontend layer has three distinct React 19 applications: Passenger for seat bookings and tracking, Driver for GPS telemetry and trip updates, and Admin for fleet management. The centralized Express API communicates with a PostgreSQL database via Prisma ORM. For real-time updates, I implemented Socket.io rooms, and for natural language interactions, I built a chatbot service supporting Ollama and cloud LLMs via structured function calling."*  
> *(Reference: [`turbo.json`](file:///d:/projects/Buzo/turbo.json), [`apps/api/src/server.ts`](file:///d:/projects/Buzo/apps/api/src/server.ts))*

#### Q2: Why did you choose a Monorepo instead of separate git repositories?
> *"In a multi-app platform like Buzo where Passenger, Driver, and Admin apps interact with the same database entities, separate repositories cause type drift and duplicate code. With Turborepo, I shared our Prisma database client (`@buzo/db`), environment validators (`@buzo/env`), and UI design system (`@repo/ui`) directly across all apps. This eliminated code duplication, gave us end-to-end TypeScript safety, and Turborepo's dependency graph ensured builds and tests only ran on changed packages."*  
> *(Reference: [`package.json`](file:///d:/projects/Buzo/package.json#L21-L24))*

---

### Database & Prisma
#### Q3: How did you design the database schema for trips, buses, and seats?
> *"I established a relational schema in Prisma. A `Bus` has a fixed capacity and is assigned to a `Driver`. A `Trip` links a `Bus` to a `Route` with scheduled departure and arrival times. When an admin creates a trip, `TripService.create` automatically generates individual `Seat` records linked to that trip with numbers 1 through bus capacity. When a booking occurs, the `Booking` record references the passenger, trip, and seat."*  
> *(Reference: [`packages/db/prisma/schema.prisma`](file:///d:/projects/Buzo/packages/db/prisma/schema.prisma#L66-L168), [`trip.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/trip.service.ts#L57-L67))*

#### Q4: Why did you use Prisma ORM instead of writing raw SQL queries?
> *"Prisma gives us compile-time type safety: every query auto-infers return types, so if I modify a column in `schema.prisma`, TypeScript immediately flags errors across the backend. Prisma also protects against SQL injection through parameterized queries and simplifies multi-table migrations. However, whenever we need atomic guarantees, I use `prisma.$transaction` to orchestrate multi-step queries safely."*  
> *(Reference: [`packages/db/src/client.ts`](file:///d:/projects/Buzo/packages/db/src/client.ts))*

---

### Validation (Zod)
#### Q5: How and where is Zod utilized in your backend?
> *"I use Zod at two critical boundaries. First, in `@buzo/env`, Zod validates environment variables at startup—crashing early with clear errors if `DATABASE_URL` or `JWT_SECRET` is missing. Second, in `apps/api/src/validation`, I define schemas for all API payloads. For example, `createBookingSchema` validates that seat IDs are valid CUIDs and uses a `.refine()` check with a `Set` to prevent duplicate seat IDs in the same request. If validation fails, our centralized error middleware catches the `ZodError` and returns a clean 400 response with exact field errors."*  
> *(Reference: [`apps/api/src/validation/booking.schema.ts`](file:///d:/projects/Buzo/apps/api/src/validation/booking.schema.ts), [`error.middleware.ts`](file:///d:/projects/Buzo/apps/api/src/middleware/error.middleware.ts#L10-L20))*

---

### Authentication & RBAC
#### Q6: How is user authentication implemented in Buzo?
> *"I built stateless JWT authentication. When users sign up or log in via `auth.controller.ts`, passwords are encrypted with `bcrypt` using 12 salt rounds. Upon verification, the server generates a JWT containing `userId` and `role` signed with a secret key. Clients attach this as a `Bearer` token in the `Authorization` header. Our `authMiddleware` verifies the signature and decodes the payload onto `req.user`."*  
> *(Reference: [`apps/api/src/lib/jwt.ts`](file:///d:/projects/Buzo/apps/api/src/lib/jwt.ts), [`auth.middleware.ts`](file:///d:/projects/Buzo/apps/api/src/middleware/auth.middleware.ts))*

#### Q7: How does your Role-Based Access Control (RBAC) middleware work?
> *"I created a reusable higher-order middleware called `requireRole` in `role.middleware.ts`. It accepts authorized roles like `requireRole('ADMIN')` or `requireRole('DRIVER', 'ADMIN')`. After `authMiddleware` authenticates the token, `requireRole` verifies whether `req.user.role` matches the required privileges. If not, it halts execution immediately with a 403 Forbidden status."*  
> *(Reference: [`apps/api/src/middleware/role.middleware.ts`](file:///d:/projects/Buzo/apps/api/src/middleware/role.middleware.ts))*

---

### Concurrency & Seat Reservations
#### Q8: How does Buzo prevent double-booking if two users click the same seat at the same time?
> *"I implemented a two-layer defense against double booking. In `BookingRepository.createBooking`, the reservation runs inside an interactive `prisma.$transaction`. First, it executes an atomic conditional update: `tx.seat.updateMany` setting status to `BOOKED` where ID matches and status is `AVAILABLE`. In PostgreSQL, this acquires row-level write locks. The first transaction succeeds and changes the seat status. The second transaction matches 0 rows, failing the check `updateResult.count === seatIds.length` and throwing an error that aborts and rolls back the transaction. Furthermore, the database schema enforces a unique constraint on `Booking.seatId`, making double booking physically impossible at the database level."*  
> *(Reference: [`apps/api/src/repositories/booking.repository.ts`](file:///d:/projects/Buzo/apps/api/src/repositories/booking.repository.ts#L53-L65), [`schema.prisma`](file:///d:/projects/Buzo/packages/db/prisma/schema.prisma#L159))*

#### Q9: What happens if a database operation fails midway through booking?
> *"Because all steps run inside `prisma.$transaction`, PostgreSQL guarantees ACID atomicity. If seat status updates but booking creation throws an error or the connection drops, Prisma automatically issues a `ROLLBACK`. The seat status reverts to `AVAILABLE`, ensuring no orphaned records or partial state exist."*  
> *(Reference: [`apps/api/src/repositories/booking.repository.ts`](file:///d:/projects/Buzo/apps/api/src/repositories/booking.repository.ts#L53-L91))*

---

### Real-Time & Socket.io
#### Q10: How does real-time bus tracking work between Driver and Passenger?
> *"The driver cockpit app simulates GPS movement along route coordinates, sending periodic telemetry updates. In `BusLocationService.updateLocation`, the server upserts coordinates in the database and broadcasts via Socket.io. Rather than broadcasting to every connected user, we use Socket.io rooms: passengers track a specific bus by joining a room with `socket.emit('bus:join', busId)`. The server emits `bus:location` only to that room. On the passenger frontend, Leaflet updates the bus marker position dynamically and recalculates the estimated time of arrival using the Haversine formula."*  
> *(Reference: [`bus-location.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/bus-location.service.ts#L28-L41), [`track.tsx`](file:///d:/projects/Buzo/apps/web/src/pages/track.tsx#L243-L252))*

#### Q11: What additional real-time features exist beyond GPS coordinates?
> *"I implemented two operational event types: `bus:delay` and `bus:break`. Drivers can report transit delays with reasons (like traffic or road work) or toggle rest breaks. The server broadcasts these events to the bus room. On the passenger UI, toast alerts notify users, the map shows paused indicators, and ETA calculations automatically factor in the added delay minutes."*  
> *(Reference: [`bus.socket.ts`](file:///d:/projects/Buzo/apps/api/src/realtime/bus.socket.ts#L57-L85), [`apps/web/src/pages/track.tsx`](file:///d:/projects/Buzo/apps/web/src/pages/track.tsx#L254-L284))*

---

### AI Chatbot & Function Calling
#### Q12: How does the AI chatbot execute actions like booking seats?
> *"The chatbot uses LLM tool-calling (function calling). In `@buzo/chatbot`, I defined JSON schemas for tools like `searchTrips`, `getDestinationWeather`, and `bookSeat`. When a user asks a question, the LLM determines whether it can answer directly or if it needs a tool. If it selects `bookSeat`, our backend receives the structured parameters, validates the user's JWT identity, checks seat availability with position preferences (like front or window seats), calls `BookingService.create`, and returns the result. The LLM then generates a natural conversational summary streamed back over Server-Sent Events."*  
> *(Reference: [`chat.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/chat.service.ts), [`bookSeat.handler.ts`](file:///d:/projects/Buzo/apps/api/src/chat/handlers/bookSeat.handler.ts))*

#### Q13: How do you fetch destination weather in the chatbot?
> *"I wrote a dedicated tool handler in `getDestinationWeather.handler.ts`. When a passenger asks about weather, the handler queries our database for the stop coordinates. If it's a general city name, it queries the Open-Meteo Geocoding API to resolve latitude and longitude, then calls Open-Meteo's weather forecast API. It maps WMO weather codes into readable phrases like 'Partly cloudy' or 'Thunderstorms' with temperatures in Celsius, without needing paid third-party API keys."*  
> *(Reference: [`getDestinationWeather.handler.ts`](file:///d:/projects/Buzo/apps/api/src/chat/handlers/getDestinationWeather.handler.ts))*

---

### Frontend Engineering
#### Q14: How is state managed across the React applications?
> *"I used Zustand for global client state and TanStack React Query for server cache. For instance, `useAuthStore` manages user session tokens with automatic `localStorage` persistence. For server data like trip lists, seats, and bookings, TanStack React Query handles caching, background re-fetching, and optimistic cache invalidation upon mutations."*  
> *(Reference: [`apps/web/src/stores/auth.store.ts`](file:///d:/projects/Buzo/apps/web/src/stores/auth.store.ts), [`booking.tsx`](file:///d:/projects/Buzo/apps/web/src/pages/booking.tsx#L33-L68))*

#### Q15: How did you implement dynamic seat pricing on the frontend?
> *"In `apps/api/src/lib/seat-pricing.ts`, I designed a pricing algorithm based on seat layout: front row window seats (1, 4, 5, 8) are Premium Front Window (₹749), front row aisle seats are Premium Front Aisle (₹699), and rows 3+ are Standard Window (₹649) or Aisle (₹599). When fetching seats for a trip, `SeatController` enriches each seat with its tier, price, and perks. In `booking.tsx`, the UI displays premium indicators, window dots, and updates the total price dynamically as seats are toggled."*  
> *(Reference: [`apps/api/src/lib/seat-pricing.ts`](file:///d:/projects/Buzo/apps/api/src/lib/seat-pricing.ts), [`booking.tsx`](file:///d:/projects/Buzo/apps/web/src/pages/booking.tsx#L111-L167))*

---

### Error Handling & Security
#### Q16: How do you handle errors across the Express API?
> *"I implemented a centralized error handling middleware in `error.middleware.ts`. It catches different error classes: `ZodError` formats as a 400 Bad Request with field paths and messages; Prisma error `P2002` formats as a 409 Conflict with the violated unique field name; domain errors containing 'not found' map to 404, and 'forbidden' maps to 403. This ensures clients receive clean, uniform error JSON without leaking internal stack traces."*  
> *(Reference: [`apps/api/src/middleware/error.middleware.ts`](file:///d:/projects/Buzo/apps/api/src/middleware/error.middleware.ts))*

#### Q17: How did you protect passenger data access?
> *"In `BookingController`, endpoints like `getById`, `delete`, and `getReceipt` check resource ownership: `if (booking.passengerId !== req.user.userId && req.user.role !== 'ADMIN') return res.status(403)`. This prevents Insecure Direct Object References (IDOR), ensuring passengers can only inspect or modify their own bookings while administrators retain oversight."*  
> *(Reference: [`apps/api/src/controllers/booking.controller.ts`](file:///d:/projects/Buzo/apps/api/src/controllers/booking.controller.ts#L53-L57))*

---

### Testing & Quality Assurance
#### Q18: What automated tests have you written for this project?
> *"I wrote 36 automated unit and integration tests running on the Bun test runner across 5 suites in `apps/api/test`. They test security invariants, duplicate seat rejection in Zod, unique constraint error handling (409), ownership authorization (403), binary PDF ticket generation, dynamic seat pricing calculations, and real-time Socket.io broadcasting for delays and driver breaks."*  
> *(Reference: [`apps/api/test/security-integrity.test.ts`](file:///d:/projects/Buzo/apps/api/test/security-integrity.test.ts), [`booking-receipt.test.ts`](file:///d:/projects/Buzo/apps/api/test/booking-receipt.test.ts))*

---

### Future Improvements
#### Q19: What would you improve if scaling this project to millions of users?
> *"I would introduce three key enhancements. First, add Redis with Socket.io Redis Adapter to scale WebSocket connections horizontally across multiple server nodes. Second, use Redis distributed locks with a 5-minute reservation TTL so selected seats are held during checkout. Third, implement BullMQ background job workers for asynchronous PDF ticket emailing and webhook delivery."*

#### Q20: How does payment work in Buzo right now?
> *"Currently, `POST /api/payments/create-checkout-session` simulates a checkout flow: it validates the user session, transitions pending bookings to `PAID`, and returns a confirmation redirect. In production, I would integrate the official Stripe or Razorpay SDK, creating a checkout session and confirming payment status via cryptographically signed webhooks before updating the database."*  
> *(Reference: [`apps/api/src/routes/payment.routes.ts`](file:///d:/projects/Buzo/apps/api/src/routes/payment.routes.ts))*

---

## SECTION E: TRICKY FOLLOW-UP QUESTIONS & DEFENSIVE HANDLING

### Concurrency & Booking
#### Q: What if two users click the same seat at the exact same millisecond?
- **Honest Code Reality:** Covered. Both requests enter `BookingRepository.createBooking`. PostgreSQL serializes the write locks on `Seat` rows during `tx.seat.updateMany`. The first request updates the seat to `BOOKED` (count = 1). The second request updates 0 rows because `status = AVAILABLE` is no longer true. Its count check throws an error, rolling back the transaction. The second user receives a 409 Conflict error.

#### Q: What if a user selects a seat, goes to payment, and never pays?
- **Honest Code Reality:** *Limitation in current code.* The seat remains in `BOOKED` status with `paymentStatus: "PENDING"`.
- **How to Answer Confidently:**
  > *"In our current MVP, the seat is marked booked upon reservation. In production, I would implement a temporary 'RESERVED' status with a 10-minute Redis TTL. If the payment webhook isn't received within 10 minutes, a background cron job releases the seat back to 'AVAILABLE'."*

#### Q: What if a user modifies the client-side JavaScript to bypass price calculation?
- **Honest Code Reality:** Covered. The client only sends `tripId` and `seatIds`. The price is never accepted from the client request body. In [`receipt.service.ts`](file:///d:/projects/Buzo/apps/api/src/services/receipt.service.ts#L71-L79), the backend calculates the exact price authoritatively based on the seat number using `getSeatTier(seat.seatNumber)`.

---

### Real-Time & WebSockets
#### Q: What if the driver loses internet connectivity while driving?
- **Honest Code Reality:** *Limitation in current code.* The bus marker stays at the last reported coordinate.
- **How to Answer Confidently:**
  > *"Currently, the passenger UI shows the timestamp of the last received telemetry. To improve resilience, I would implement a heartbeat mechanism: if no coordinates are received for 60 seconds, the passenger UI automatically flags the status as 'Signal Lost / Reconnecting' and falls back to scheduled timetable estimates."*

#### Q: What happens if 50,000 passengers open the map simultaneously? Will your Node server crash?
- **Honest Code Reality:** A single Node.js instance would run out of file descriptors and memory managing 50,000 concurrent socket connections.
- **How to Answer Confidently:**
  > *"A single WebSocket server can comfortably handle several thousand active connections. To scale to 50,000, I would deploy multiple Express/Socket instances behind an Nginx load balancer with sticky sessions, and use Redis Pub/Sub (`@socket.io/redis-adapter`) to broadcast coordinate updates across instances."*

---

### Security & API
#### Q: How do you prevent unauthorized GPS coordinate spoofing from malicious users or wrong drivers?
- **Honest Code Reality:** Enforced at both route and controller levels.
  1. `PATCH /api/buses/:busId/location` requires role `DRIVER` or `ADMIN` via `requireRole("DRIVER", "ADMIN")`.
  2. In `BusLocationController.update`, if the caller has role `DRIVER`, the controller checks `driverRepository.findByUserId` and verifies `driver.assignedBusId === req.params.busId`. If a driver attempts to spoof another driver's bus coordinates, the backend halts execution and returns `403 Forbidden`.

#### Q: How do you handle JWT revocation and user logout if JWTs are stateless?
- **Honest Code Reality:** Buzo implements a dual-layer in-memory `tokenRevocationService`.
  1. When a user hits `POST /api/auth/logout`, their token is SHA-256 hashed and added to a revocation blacklist with TTL equal to the token's remaining lifespan.
  2. For administrative demotions or credential resets, `revokeAllUserTokens(userId)` records a revocation timestamp, instantly invalidating all tokens issued to that user prior to that timestamp.
  3. `authMiddleware` evaluates `tokenRevocationService.isRevoked(token, payload)` on every request.

#### Q: How do you protect authentication and AI chat endpoints from brute force and DoS?
- **Honest Code Reality:** Buzo configures `helmet` for HTTP security headers (HSTS, CSP, X-Frame-Options, CORP) and route-scoped `express-rate-limit` middleware:
  - `/api/auth/login` & `/api/auth/signup`: limited to 10 attempts per 15 minutes per IP.
  - `/api/chat`: limited to 30 requests per minute to prevent LLM API budget depletion.
  - Global `/api`: 500 requests per 15 minutes.

#### Q: How do you prevent a regular passenger from hitting Admin APIs using Postman?
- **Honest Code Reality:** Fully enforced. All administrative routes (`/api/buses`, `/api/routes`, `/api/trips`, `/api/drivers`) chain `requireRole("ADMIN")` after `authMiddleware`.
- **How to Answer Confidently:**
  > *"Even if a passenger acquires a valid JWT and crafts an HTTP request in Postman, `requireRole('ADMIN')` inspects the verified `req.user.role`. Since the passenger token has `role: 'PASSENGER'`, the middleware halts execution and returns a 403 Forbidden error before the controller is ever reached."*

#### Q: What if an attacker steals a passenger's JWT? Can they change other people's reservations?
- **Honest Code Reality:** No. Ownership is strictly enforced.
- **How to Answer Confidently:**
  > *"While JWT theft is a risk we mitigate with HTTPS, our controller layer enforces strict resource ownership. In `booking.controller.ts`, every booking lookup and cancellation verifies `booking.passengerId === req.user.userId`. The attacker could only inspect or modify the compromised user's bookings, never another passenger's."*

---

### Chatbot & AI
#### Q: What if the LLM calls the `bookSeat` tool with hallucinated, non-existent seat IDs?
- **Honest Code Reality:** Fully covered by backend validation.
- **How to Answer Confidently:**
  > *"The LLM does not generate raw seat IDs. In `bookSeat.handler.ts`, the tool searches for real trips in our database, retrieves real available seat records from `seatRepository.findByTripId`, and filters them based on position. It passes verified database IDs to `bookingService.create`. Even if invalid IDs were passed, Prisma's foreign key constraint and our service checks would reject the request."*

#### Q: What if Ollama is running locally and crashes? Does the whole backend crash?
- **Honest Code Reality:** Handled. The chat service wraps tool execution in a `try/catch` block.
- **How to Answer Confidently:**
  > *"No. The chat controller catches errors gracefully and returns a 500 error or user-friendly message without terminating the Node.js process. Furthermore, our client supports multi-provider fallback: if Ollama is unavailable, the environment configuration allows seamlessly toggling to cloud providers like Groq or Gemini."*

---

## SECTION F: 10 CORE CODE SNIPPETS TO WRITE & EXPLAIN LIVE

### 1. Atomic Seat Booking Transaction
- **Spoken Explanation (Say this while writing):**
  1. *"I wrap the booking flow in an interactive Prisma transaction to ensure atomicity."*
  2. *"I run an atomic `updateMany` checking that the seat status is currently `AVAILABLE` before updating to `BOOKED`."*
  3. *"If the updated count doesn't match the number of seats requested, another user took a seat, so I throw an error to trigger an automatic rollback."*

```typescript
// Live-Coding Simplified Version (apps/api/src/repositories/booking.repository.ts)
async function bookSeats(passengerId: string, tripId: string, seatIds: string[]) {
  return await prisma.$transaction(async (tx) => {
    // 1. Atomically mark available seats as booked
    const result = await tx.seat.updateMany({
      where: {
        id: { in: seatIds },
        status: "AVAILABLE",
      },
      data: { status: "BOOKED" },
    });

    // 2. Concurrency guard: verify all requested seats were captured
    if (result.count !== seatIds.length) {
      throw new Error("One or more selected seats are no longer available");
    }

    // 3. Create booking records
    const bookings = [];
    for (const seatId of seatIds) {
      const booking = await tx.booking.create({
        data: {
          passengerId,
          tripId,
          seatId,
          paymentStatus: "PENDING",
        },
      });
      bookings.push(booking);
    }

    return bookings;
  });
}
```

---

### 2. JWT Authentication Middleware
- **Spoken Explanation:**
  1. *"I extract the `Authorization` header and confirm it starts with the `Bearer` scheme."*
  2. *"I verify the token cryptographically using `jwt.verify` and our server's secret key."*
  3. *"I attach the decoded user payload to `req.user` so all downstream route handlers know who is making the request."*

```typescript
// Live-Coding Simplified Version (apps/api/src/middleware/auth.middleware.ts)
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      role: "ADMIN" | "DRIVER" | "PASSENGER";
    };
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
```

---

### 3. Role-Based Access Control (RBAC) Middleware
- **Spoken Explanation:**
  1. *"This is a higher-order middleware factory that accepts a list of authorized roles."*
  2. *"It first confirms that `req.user` exists from the prior authentication check."*
  3. *"It checks whether the user's role is in the allowed list, returning 403 Forbidden if unauthorized."*

```typescript
// Live-Coding Simplified Version (apps/api/src/middleware/role.middleware.ts)
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}
```

---

### 4. Zod Booking Validation Schema
- **Spoken Explanation:**
  1. *"I define the expected shape of the booking payload requiring a trip ID and an array of seat IDs."*
  2. *"I ensure at least one seat is chosen using `.min(1)`."*
  3. *"I use a custom `.refine()` validator with a `Set` to prevent duplicate seat IDs within the same request."*

```typescript
// Live-Coding Simplified Version (apps/api/src/validation/booking.schema.ts)
import { z } from "zod";

export const createBookingSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  seatIds: z
    .array(z.string())
    .min(1, "At least one seat must be selected")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Duplicate seat IDs are not allowed in the same booking",
    }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
```

---

### 5. Centralized Error Handling Middleware
- **Spoken Explanation:**
  1. *"Express error middleware takes 4 arguments: `err`, `req`, `res`, `next`."*
  2. *"I check if the error is an instance of `ZodError` to format field-specific validation messages with status 400."*
  3. *"I check for Prisma error code `P2002` to return 409 Conflict for unique constraint violations."*

```typescript
// Live-Coding Simplified Version (apps/api/src/middleware/error.middleware.ts)
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  if (err?.code === "P2002") {
    return res.status(409).json({
      message: "Unique constraint violation",
      fields: err.meta?.target,
    });
  }

  const status = err.statusCode || 500;
  return res.status(status).json({
    message: err.message || "Internal server error",
  });
}
```

---

### 6. Socket.io Bus Room Event Management
- **Spoken Explanation:**
  1. *"When a client connects, I register listeners for room subscriptions."*
  2. *"Passengers join a bus room using `socket.join(busId)` so they only receive updates for their bus."*
  3. *"When the driver emits new coordinates, the server broadcasts them exclusively to that bus room."*

```typescript
// Live-Coding Simplified Version (apps/api/src/realtime/bus.socket.ts)
import { Server, Socket } from "socket.io";

export function registerBusSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    // Passenger joins tracking channel
    socket.on("bus:join", (busId: string) => {
      socket.join(busId);
    });

    // Passenger leaves tracking channel
    socket.on("bus:leave", (busId: string) => {
      socket.leave(busId);
    });

    // Driver broadcasts location
    socket.on("driver:location", (data: { busId: string; lat: number; lng: number }) => {
      io.to(data.busId).emit("bus:location", {
        latitude: data.lat,
        longitude: data.lng,
        updatedAt: new Date().toISOString(),
      });
    });
  });
}
```

---

### 7. Passenger Live Map Socket Listener (React)
- **Spoken Explanation:**
  1. *"I initialize a Socket.io client instance inside a `useEffect` hook."*
  2. *"On connection, I emit `bus:join` with the trip's bus ID to subscribe to telemetry."*
  3. *"When `bus:location` events arrive, I update local state to re-render the Leaflet marker, and clean up listeners on unmount."*

```typescript
// Live-Coding Simplified Version (apps/web/src/pages/track.tsx)
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useBusTracking(busId: string) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!busId) return;

    const socket: Socket = io("http://localhost:5000");

    socket.on("connect", () => {
      socket.emit("bus:join", busId);
    });

    socket.on("bus:location", (data: { latitude: number; longitude: number }) => {
      setLocation({ lat: data.latitude, lng: data.longitude });
    });

    return () => {
      socket.emit("bus:leave", busId);
      socket.disconnect();
    };
  }, [busId]);

  return location;
}
```

---

### 8. Haversine Distance & ETA Calculation
- **Spoken Explanation:**
  1. *"The Haversine formula calculates the great-circle distance between two GPS points on a sphere."*
  2. *"I convert differences in latitude and longitude from degrees to radians."*
  3. *"Dividing the distance by average transit speed gives a dynamic ETA in minutes."*

```typescript
// Live-Coding Simplified Version (apps/web/src/pages/track.tsx)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateEtaMinutes(distKm: number, speedKmh = 30): number {
  return Math.max(1, Math.round((distKm / speedKmh) * 60));
}
```

---

### 9. Chatbot LLM Tool Execution Loop
- **Spoken Explanation:**
  1. *"I send the user prompt along with JSON schemas defining available tools to the LLM."*
  2. *"If the model requests a function call, I execute the matching tool handler using the model's arguments."*
  3. *"I return the tool result back into a streaming generator so the user sees real-time token output."*

```typescript
// Live-Coding Simplified Version (apps/api/src/services/chat.service.ts)
export async function executeChat(message: string, userId?: string) {
  // 1. Query LLM with tool definitions
  const action = await callLLMWithTools(message, toolRegistry);

  // 2. Direct textual response
  if (action.type === "text") {
    return { text: action.text };
  }

  // 3. Autonomous tool invocation
  const handler = toolHandlers[action.name];
  if (!handler) throw new Error(`Unknown tool: ${action.name}`);

  const toolOutput = await handler(action.arguments, userId);

  // 4. Summarize result
  const summary = await summarizeWithLLM(message, toolOutput);
  return { tool: action.name, data: toolOutput, response: summary };
}
```

---

### 10. Dynamic Tiered Seat Pricing Helper
- **Spoken Explanation:**
  1. *"I categorize seats using seat numbers: rows 1 and 2 (seats 1-8) are classified as front row."*
  2. *"Using modulo 4, remainder 1 and remainder 0 represent window seats in a standard 2+2 layout."*
  3. *"I return structured tier names, pricing, and perks for the frontend to render dynamically."*

```typescript
// Live-Coding Simplified Version (apps/api/src/lib/seat-pricing.ts)
export function getSeatTier(seatNumber: number) {
  const isFront = seatNumber >= 1 && seatNumber <= 8;
  const isWindow = seatNumber % 4 === 1 || seatNumber % 4 === 0;

  if (isFront && isWindow) {
    return { tier: "PREMIUM_FRONT_WINDOW", name: "Premium Front Window", price: 749 };
  }
  if (isFront && !isWindow) {
    return { tier: "PREMIUM_FRONT_AISLE", name: "Premium Front Aisle", price: 699 };
  }
  if (!isFront && isWindow) {
    return { tier: "STANDARD_WINDOW", name: "Standard Window", price: 649 };
  }
  return { tier: "STANDARD_AISLE", name: "Standard Aisle", price: 599 };
}
```

---

## SECTION G: CORE CONCEPTS & ARCHITECTURAL GLOSSARY

- **Monorepo & Turborepo Caching:** A repository containing multiple projects. Turborepo creates a directed acyclic graph (DAG) of project tasks. If the inputs (source files and environment variables) have not changed, Turborepo skips running the build or tests and replays the cached output instantly.
- **ORM vs Raw SQL:** Raw SQL gives maximum control over query plans but requires manual string concatenation, leaving apps vulnerable to SQL injection and runtime type mismatches. An ORM like Prisma abstracts SQL behind type-safe TypeScript methods, validating schema models at compile time.
- **Database Transactions & ACID:** A unit of work where multiple database commands execute together.
  - *Atomicity:* All operations succeed or none do (rollback on error).
  - *Consistency:* Database constraints (unique keys, foreign keys) are never violated.
  - *Isolation:* Concurrent transactions do not interfere with each other.
  - *Durability:* Once committed, updates persist even across server crashes.
- **Unique Constraints:** Rules enforced directly by the database engine ensuring no duplicate values exist in a column or combination of columns (e.g. `Booking.seatId @unique`).
- **JWT (JSON Web Token):** A compact, URL-safe token format consisting of Header, Payload, and Signature (`header.payload.signature`). The server signs the payload using a secret key; clients present it to authenticate without server-side database lookups.
- **Authentication vs Authorization:**
  - *Authentication (401):* Verifying *who you are* (verifying email and password to issue a token).
  - *Authorization (403):* Verifying *what you are allowed to do* (checking whether `req.user.role === 'ADMIN'`).
- **RBAC (Role-Based Access Control):** Restricting access to computer or network resources based on the user's role within an organization (`PASSENGER`, `DRIVER`, `ADMIN`).
- **WebSockets vs HTTP:** HTTP is a stateless request-response protocol where clients must repeatedly initiate connections. WebSockets establish an open, persistent, full-duplex TCP connection over which server and client can push messages at any time with minimal header overhead.
- **Socket.io Rooms:** Server-only abstractions that partition connected sockets into arbitrary communication channels (e.g. `busId`). Emitting to a room only delivers packets to members of that specific room.
- **LLM Function Calling (Tool Calling):** A capability where an LLM is provided with structured JSON schemas describing available software functions. Rather than guessing an answer, the model outputs structured arguments directing the backend program to invoke the function on its behalf.
- **Schema Validation:** Verifying that incoming runtime data conforms to expected types, bounds, and business constraints before processing.
- **CORS (Cross-Origin Resource Sharing):** A browser security mechanism that restricts web pages from making HTTP requests to a domain, port, or protocol different from the one that served the web page.

---

## SECTION H: HONEST CODE LIMITATIONS & FUTURE IMPROVEMENTS

### Architectural Bottlenecks Identified & Solved (High-Value Interview Proof Points)
1. **N-Trip Full Table Scan & Event Loop Levenshtein (SOLVED):**
   - *Previous Bottleneck:* `tripRepository.searchTrips` ran `prisma.trip.findMany()` with zero WHERE filters, bringing all trips and stops into memory, followed by O(N * M) Levenshtein matrix calculations on the Node.js event loop.
   - *Engineered Solution:* Pushed search filters directly to PostgreSQL using Prisma relation filters (`route.stops.some.stop.name: { contains: origin, mode: 'insensitive' }`) and indexed date calendar windows (`departureTime: { gte, lte }`). Added composite database indexes (`Trip([departureTime, status])`, `Trip([routeId])`, `Booking([paymentStatus, createdAt])`, `RouteStop([stopId])`). Levenshtein was isolated as an emergency typo fallback evaluated ONLY against the small `Stop` table (~20-50 cities) rather than thousands of trips, eliminating event loop blocking.
2. **1 Hz Driver Telemetry REST Spam to Database (SOLVED):**
   - *Previous Bottleneck:* Driver GPS simulation issued an HTTP PATCH every 1,000ms, executing `busRepository.findById` + PostgreSQL upsert on every second. 50 active buses would trigger 100 DB queries/sec.
   - *Engineered Solution:* Streamed high-frequency 1Hz GPS coordinates directly over persistent WebSockets (`socket.emit("busLocationUpdate")`), broadcasting instantly to passengers and admin radar with sub-millisecond latency. Throttled database persistence in `busLocationService` to once every 30 seconds or upon stop arrival (`forcePersist: true`), and cached bus metadata in memory. Slashed database write load from 100 queries/sec down to ~1.6 queries/sec (a 98.4% reduction).
3. **Stale Seat Reservation Lockouts (SOLVED):**
   - *Previous Bottleneck:* Abandoned checkouts left seats locked indefinitely.
   - *Engineered Solution:* Implemented a 10-minute hold window (`RESERVED` state) with timestamp math, auto-cancellation endpoints, and an active sweeper (`cleanupExpiredReservations`) releasing stale holds back to `AVAILABLE` with real-time Socket.io seat-map updates.

### Remaining Limitations in the Current Code
1. **Mock Payment Flow:** `POST /api/payments/create-checkout-session` simulates checkout by flipping pending holds to `PAID` without connecting to live Stripe/Razorpay webhooks.
2. **Single-Node Socket.io In-Memory Adapter:** Sockets are tracked in local process memory; horizontal multi-instance scaling requires `@socket.io/redis-adapter`.
3. **No SMS/Push Notifications:** While the repository has automated PDF ticket receipt generation and email simulation, live SMS alerts (Twilio) are not yet integrated.

---

### Realistic 8–10 Future Roadmap Improvements
1. **Redis Pub/Sub Socket Adapter:** Integrate `@socket.io/redis-adapter` so WebSocket connections scale horizontally across a cluster of server nodes.
2. **Payment Gateway Integration:** Replace mock checkout with real Stripe or Razorpay SDKs, confirming seat bookings via signed webhook callbacks.
3. **Redis Seat Hold TTL:** Implement a 10-minute temporary seat reservation lock in Redis that automatically releases uncompleted bookings.
4. **PostgreSQL Trigram Search Indexing:** Move fuzzy route searching from Node.js memory into PostgreSQL using `pg_trgm` extension indexes for scalable sub-millisecond queries.
5. **BullMQ Background Worker Queues:** Offload PDF ticket generation and email dispatch to asynchronous background worker queues powered by Redis.
6. **OpenTelemetry APM & Prometheus Metrics:** Instrument socket connection latency, HTTP response times, and database query durations.
7. **Two-Factor Authentication (2FA):** Add TOTP-based multi-factor authentication for Driver and Admin logins.
8. **Automated End-to-End Testing:** Implement Playwright browser tests covering the full booking and tracking journey across the three frontends.
9. **Docker & Kubernetes Deployment:** Package each application into multi-stage Docker containers with Helm charts for deployment to cloud clusters.
10. **Driver Native Mobile App:** Wrap the driver cockpit into a React Native application leveraging device background GPS hardware APIs.

---

### How to Talk About Limitations Confidently
> *"I designed Buzo as a production-grade prototype to demonstrate real-time distributed architecture, concurrency control, and AI integration. To keep our development velocity focused on core architectural challenges like double-booking prevention and WebSocket telemetry, I prioritized mock payment workflows over live merchant onboarding. If this were going into production tomorrow, my first two sprints would focus on hooking up Stripe webhooks and deploying a Redis cluster for socket scaling and temporary seat locks."*

---

## SECTION I: RAPID-FIRE 20-QUESTION BLITZ

1. **What is Buzo?**  
   *A full-stack bus reservation, real-time GPS tracking, and AI assistant platform.*
2. **What monorepo tool did you use and why?**  
   *Turborepo with Bun, for shared internal packages, topological build pipelines, and fast caching.*
3. **What are the three frontend applications?**  
   *Passenger web portal, Driver telemetry cockpit, and Admin operations portal.*
4. **How do you prevent double booking?**  
   *Through atomic conditional updates inside a Prisma transaction alongside database unique constraints.*
5. **What is the database unique constraint on bookings?**  
   *`seatId String @unique` on the `Booking` model and `@@unique([tripId, seatNumber])` on `Seat`.*
6. **What does Zod do in your project?**  
   *It validates incoming API request bodies and startup environment variables with strict TypeScript types.*
7. **How is authentication handled?**  
   *Using stateless JSON Web Tokens (JWT) signed with HMAC-SHA256 and passwords encrypted via bcrypt.*
8. **What is the difference between 401 and 403 status codes?**  
   *401 means unauthenticated (missing or invalid token); 403 means authenticated but unauthorized (insufficient role).*
9. **How does live bus tracking work?**  
   *Drivers emit coordinates over WebSockets/REST, and Socket.io broadcasts to passengers subscribed to that bus's room.*
10. **Why use Socket.io rooms instead of broadcasting globally?**  
    *Rooms isolate telemetry traffic so clients only receive location updates for the specific bus they are tracking.*
11. **How do you calculate ETA on the map?**  
    *By calculating distance using the Haversine formula and dividing by average transit speed.*
12. **What mapping library did you use?**  
    *Leaflet with React-Leaflet, utilizing custom HTML pulsing marker icons and polyline tracks.*
13. **What LLM models are supported by the chatbot?**  
    *Local Ollama (Qwen), Cloud Groq (Qwen 3.8 27B), and Google Gemini Flash.*
14. **How does the chatbot book seats autonomously?**  
    *Using LLM tool calling where the model triggers the `bookSeat` tool handler, which validates the user and executes the booking transaction.*
15. **How does the chatbot fetch destination weather?**  
    *It resolves stop or city coordinates and calls the free Open-Meteo REST API.*
16. **How does the chatbot stream text responses?**  
    *Over HTTP Server-Sent Events (`text/event-stream`) chunk-by-chunk.*
17. **What seat pricing tiers exist in Buzo?**  
    *Premium Front Window (₹749), Premium Front Aisle (₹699), Standard Window (₹649), and Standard Aisle (₹599).*
18. **How are ticket receipts generated?**  
    *As dynamic binary `%PDF-1.4` streams built on-the-fly using a custom PDF stream builder without heavy external libraries.*
19. **What happens if a driver takes a break?**  
    *The driver toggles a rest break, broadcasting a `bus:break` socket event that updates passenger maps and pauses ETA calculations.*
20. **How many automated tests exist in the repo?**  
    *36 automated unit and integration tests executing under the Bun test runner.*
