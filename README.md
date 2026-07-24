# Buzo - Modern Bus Reservation & Live Tracking Platform

Buzo is a comprehensive, real-time bus reservation and tracking system built with a modern, high-performance tech stack. It features a seamless booking experience, live GPS tracking of buses via WebSockets, and an intelligent AI chatbot that assists users with scheduling, booking, and travel queries.

## 🚀 Key Features

### 🌟 For Passengers
- **Smart Search & Booking:** Search for buses by origin, destination, and date. Select specific seats visually.
- **AI Chatbot Assistant:** Powered by advanced LLMs (Ollama/Gemini), the assistant can check schedules, book seats, answer queries, and fetch real-time weather at your destination.
- **Live Bus Tracking:** Watch your bus move in real-time on a live interactive map (Leaflet + Socket.io).
- **Payment Integration:** Secure checkout process.

### 🚍 For Drivers
- **Dedicated Dashboard:** Drivers have their own dedicated application to manage their assigned trips.
- **Live Location Broadcasting:** The driver app continually broadcasts its GPS coordinates to the server, allowing passengers and admins to track the journey seamlessly.

### 🛡️ For Administrators
- **Full Management Suite:** Manage buses, routes, stops, drivers, and user bookings from a centralized dashboard.
- **Fleet Overview:** Real-time visibility of the entire fleet.

## 🛠️ Technology Stack

Buzo is structured as a **Turborepo** monorepo, optimized for fast builds and shared local packages.

**Frontend (Web, Admin, Driver Apps)**
- React 19 / Vite
- Tailwind CSS & shadcn/ui
- Zustand (State Management)
- React Router DOM
- Leaflet & React-Leaflet (Maps)

**Backend (API)**
- Node.js & Express
- Socket.io (Real-time bi-directional communication)
- Prisma ORM (PostgreSQL via NeonDB)
- Zod (Schema Validation)
- JWT Authentication

**AI Integration**
- Vercel AI SDK
- Support for Local LLMs (Ollama - Qwen) and Cloud LLMs (Gemini)

## 📦 Project Structure

```text
Buzo/
├── apps/
│   ├── admin/      # Administrator Dashboard
│   ├── api/        # Core Express Backend & Socket Server
│   ├── driver/     # Driver App (Location broadcasting)
│   └── web/        # Main Passenger Facing Website
├── packages/
│   ├── chatbot/    # AI Agent logic and tool definitions
│   ├── db/         # Prisma schema and generated database client
│   ├── env/        # Environment variable validation (Zod)
│   └── ui/         # Shared UI components (shadcn)
```

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (v1.x or higher)
- PostgreSQL Database (or a [Neon](https://neon.tech/) account)
- (Optional) [Ollama](https://ollama.com/) running locally for the local AI model.

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Buzo
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and populate it with your credentials:
   ```env
   DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
   JWT_SECRET="your-super-secret-key-at-least-32-characters"
   GEMINI_API_KEY="your-gemini-key" # Optional if using Ollama
   LLM_PROVIDER="ollama" # or "gemini"
   OLLAMA_MODEL="qwen3:4b-instruct-2507-q4_K_M"
   PORT=5000
   CLIENT_URL="http://localhost:5173"
   ```

4. **Database Migration**
   Push the schema to your database and generate the Prisma client:
   ```bash
   cd packages/db
   bunx prisma db push
   bunx prisma generate
   ```

5. **Run the Development Servers**
   From the root of the project, start all applications concurrently:
   ```bash
   bun run dev
   ```

   This will start:
   - **Passenger Web App:** `http://localhost:5173`
   - **Admin Dashboard:** `http://localhost:5174`
   - **Driver App:** `http://localhost:5175`
   - **API Server:** `http://localhost:5000`

## 🏗️ Architecture Highlights

- **Type Safety End-to-End:** 100% strict TypeScript configuration across the monorepo.
- **Shared Code:** Reusable UI components (`@repo/ui`) and database schema (`@buzo/db`) drastically reduce boilerplate and ensure consistency across the three frontends.
- **AI Tool Calling:** The chatbot utilizes LLM tool-calling (function calling) capabilities to directly interact with backend services (e.g., `bookSeat`, `checkSeats`, `getDestinationWeather`).

## 📄 License

This project is licensed under the MIT License.
