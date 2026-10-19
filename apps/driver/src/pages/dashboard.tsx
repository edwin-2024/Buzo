import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { 
  LogOut, 
  Navigation, 
  MapPin, 
  Play, 
  Square, 
  Loader2, 
  Coffee, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Gauge,
  Radio,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Bus,
  ChevronRight
} from "lucide-react"
import { io, Socket } from "socket.io-client"

import { useAuthStore } from "../stores/auth.store"
import { api } from "../lib/axios"
import { ModeToggle } from "../components/mode-toggle"

export function DashboardPage() {
  const { user, logout, token } = useAuthStore()
  const navigate = useNavigate()
  
  const [activeTrip, setActiveTrip] = useState<any | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  const [activeDelay, setActiveDelay] = useState<{ minutes: number; reason: string } | null>(null)
  
  // Ref for the simulation interval and break state
  const simulationRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOnBreakRef = useRef(false)
  const socketRef = useRef<Socket | null>(null)

  const { data: trips, isLoading } = useQuery({
    queryKey: ["my-trips"],
    queryFn: async () => {
      const { data } = await api.get("/trips/my-trips")
      return data
    }
  })

  useEffect(() => {
    // Setup socket connection for live updates
    socketRef.current = io("http://localhost:3000", {
      auth: { token }
    });
    
    return () => {
      if (socketRef.current) socketRef.current.disconnect()
      if (simulationRef.current) clearInterval(simulationRef.current)
    }
  }, [token])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const toggleBreak = () => {
    if (!activeTrip) return;
    const nextState = !isOnBreak;
    setIsOnBreak(nextState);
    isOnBreakRef.current = nextState;

    if (socketRef.current) {
      socketRef.current.emit("bus:break", {
        busId: activeTrip.busId,
        tripId: activeTrip.id,
        onBreak: nextState,
        reason: nextState ? "Driver rest break" : undefined
      });
    }
  };

  const handleReportDelay = (minutes: number, reason: string) => {
    if (!activeTrip || !socketRef.current) return;
    if (minutes <= 0) {
      setActiveDelay(null);
      socketRef.current.emit("bus:delay", {
        busId: activeTrip.busId,
        tripId: activeTrip.id,
        delayMinutes: 0,
        reason: "On time"
      });
    } else {
      setActiveDelay({ minutes, reason });
      socketRef.current.emit("bus:delay", {
        busId: activeTrip.busId,
        tripId: activeTrip.id,
        delayMinutes: minutes,
        reason
      });
    }
  };

  const startSimulation = (trip: any) => {
    setActiveTrip(trip)
    setIsSimulating(true)
    setIsOnBreak(false)
    isOnBreakRef.current = false
    setCurrentStopIndex(0)
    setActiveDelay(null)
    
    // Announce departure via API to update trip status
    api.patch(`/trips/${trip.id}`, { status: "IN_PROGRESS" }).catch(console.error);

    // Filter out stops with invalid coordinates to prevent NaN crashes
    const validStops = [...trip.route.stops]
      .sort((a: any, b: any) => a.order - b.order)
      .filter((s: any) => 
        s.stop && s.stop.latitude && s.stop.longitude && 
        !isNaN(parseFloat(s.stop.latitude)) && !isNaN(parseFloat(s.stop.longitude))
      );
    
    if (validStops.length < 2) {
      stopSimulation(trip);
      return;
    }

    let stopIndex = 0;
    let step = 0;
    const INTERVAL_MS = 1000;
    const SPEED_KMH = 60; // 60 km/h
    const SPEED_KMS = SPEED_KMH / 3600; // km per second

    // Helper to calculate distance between two coords in km
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      return R * c; // Distance in km
    };
    
    // Calculate total steps for current segment
    let currentSegmentSteps = 0;
    
    simulationRef.current = setInterval(() => {
      if (isOnBreakRef.current) {
        return;
      }

      const currentStop = validStops[stopIndex]?.stop;
      const nextStop = validStops[stopIndex + 1]?.stop;
      
      if (!nextStop || !currentStop) {
        if (currentStop) {
          const finalLocation = {
            latitude: parseFloat(currentStop.latitude),
            longitude: parseFloat(currentStop.longitude),
            heading: 0,
            speed: 0
          };
          api.patch(`/buses/${trip.busId}/location`, finalLocation).catch(console.error);
        }
        stopSimulation(trip);
        return;
      }
      
      const lat1 = parseFloat(currentStop.latitude);
      const lng1 = parseFloat(currentStop.longitude);
      const lat2 = parseFloat(nextStop.latitude);
      const lng2 = parseFloat(nextStop.longitude);
      
      if (step === 0) {
        const distKm = getDistance(lat1, lng1, lat2, lng2);
        currentSegmentSteps = Math.max(1, Math.ceil(distKm / SPEED_KMS));
      }

      // Linear interpolation for smooth movement
      const fraction = step / currentSegmentSteps;
      const currentLat = lat1 + (lat2 - lat1) * fraction;
      const currentLng = lng1 + (lng2 - lng1) * fraction;
      
      const heading = Math.atan2(lng2 - lng1, lat2 - lat1) * (180 / Math.PI);

      const locationData = {
        latitude: currentLat,
        longitude: currentLng,
        heading: heading,
        speed: SPEED_KMH
      }
      
      // Update DB and emit socket event
      api.patch(`/buses/${trip.busId}/location`, locationData).catch(console.error)

      step++;
      
      if (step >= currentSegmentSteps) {
         step = 0;
         stopIndex++;
         
         const originalIndex = trip.route.stops.findIndex((s: any) => s.stopId === validStops[stopIndex]?.stopId);
         if (originalIndex !== -1) {
            setCurrentStopIndex(originalIndex);
         } else {
            setCurrentStopIndex(stopIndex);
         }
      }
    }, INTERVAL_MS)
  }

  const stopSimulation = (trip: any) => {
    if (simulationRef.current) clearInterval(simulationRef.current)
    if (isOnBreakRef.current && socketRef.current && trip) {
      socketRef.current.emit("bus:break", {
        busId: trip.busId,
        tripId: trip.id,
        onBreak: false
      });
    }
    if (activeDelay && socketRef.current && trip) {
      socketRef.current.emit("bus:delay", {
        busId: trip.busId,
        tripId: trip.id,
        delayMinutes: 0,
        reason: "Trip completed"
      });
    }
    setActiveDelay(null)
    setIsOnBreak(false)
    isOnBreakRef.current = false
    setIsSimulating(false)
    setActiveTrip(null)
    
    // Mark as completed
    api.patch(`/trips/${trip.id}`, { status: "COMPLETED" }).catch(console.error);
  }

  const nextStop = activeTrip?.route?.stops?.[currentStopIndex + 1]?.stop;
  const currentStop = activeTrip?.route?.stops?.[currentStopIndex]?.stop;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Cockpit Header */}
      <header className="border-b border-border/60 bg-card/90 backdrop-blur-xl sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <Navigation className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-base tracking-tight text-foreground">Buzo</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-secondary text-secondary-foreground border border-border">
                  Cockpit
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">In-Cab Transit Navigation</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Telemetry Ping */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Telemetry Connected</span>
            </div>

            {/* Portal Jumps */}
            <div className="hidden lg:flex items-center gap-2 border-l border-border/60 pl-3">
              <a 
                href="http://localhost:5173" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-secondary/60 transition-colors"
              >
                Passenger App <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
              <a 
                href="http://localhost:5174" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-secondary/60 transition-colors"
              >
                Admin Portal <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>

            <ModeToggle />

            {/* Driver Profile */}
            <div className="flex items-center gap-2 pl-1">
              <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                {user?.name?.[0] || "D"}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-foreground leading-tight flex items-center gap-1">
                  {user?.name || "Driver"}
                  <ShieldCheck className="w-3 h-3 text-primary" />
                </div>
                <div className="text-[10px] text-muted-foreground font-mono leading-tight">In-Cab Duty: Active</div>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              title="Sign out of Cockpit"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* ACTIVE COCKPIT HUD (When a trip is simulated/in progress) */}
        {activeTrip && (
          <div className={`p-6 rounded-2xl border transition-all duration-300 hud-card ${
            isOnBreak 
              ? 'bg-amber-950/20 border-amber-500/30 ring-1 ring-amber-500/20' 
              : 'bg-card/95 border-primary/30 ring-1 ring-primary/20'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border/60">
              {/* Left info: Route & Status */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                    <Bus className="w-3.5 h-3.5" />
                    Coach {activeTrip.bus?.number || activeTrip.busId}
                  </span>
                  {isOnBreak ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                      <Coffee className="w-3.5 h-3.5" />
                      REST BREAK ACTIVE
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 hud-phosphor-emerald border border-emerald-500/30 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      LIVE EN ROUTE
                    </span>
                  )}
                  {activeDelay && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      +{activeDelay.minutes}m DELAY BROADCAST
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {activeTrip.route.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Current: <strong className="text-foreground">{currentStop?.name || "Depot"}</strong></span>
                  <ChevronRight className="w-3.5 h-3.5 text-primary" />
                  <span>Next Target: <strong className="text-primary font-bold">{nextStop?.name || "Terminal Station"}</strong></span>
                </div>
              </div>

              {/* Digital Speedometer Gauge HUD */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/70 border border-border/80">
                  <div className={`p-3 rounded-xl ${isOnBreak ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary'}`}>
                    <Gauge className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cockpit Telemetry</p>
                    <div className="text-3xl font-black font-mono text-foreground tracking-tight">
                      {isOnBreak ? "0" : "60"} <span className="text-sm font-semibold text-muted-foreground font-sans">km/h</span>
                    </div>
                  </div>
                </div>

                {/* Main Action Buttons: Take Break & End Trip */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={toggleBreak}
                    className={`hud-tap-target flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm transition-all duration-150 shadow-md cursor-pointer ${
                      isOnBreak 
                        ? "bg-amber-500 hover:bg-amber-600 text-black font-extrabold" 
                        : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {isOnBreak ? (
                      <>
                        <Play className="h-4 w-4 fill-black" /> Resume Driving
                      </>
                    ) : (
                      <>
                        <Coffee className="h-4 w-4" /> Driver Rest Break
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => {
                      if (confirm("Conclude this trip and release coach?")) {
                        stopSimulation(activeTrip);
                      }
                    }}
                    className="hud-tap-target flex items-center justify-center gap-2 py-3 px-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold text-sm transition-all duration-150 shadow-md cursor-pointer"
                  >
                    <Square className="h-4 w-4 fill-white" /> Conclude Trip
                  </button>
                </div>
              </div>
            </div>

            {/* Delay Reporting Controls */}
            <div className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Broadcast Delay to Fleet Radar & Passengers
                  </span>
                </div>
                {activeDelay ? (
                  <button
                    onClick={() => handleReportDelay(0, "On time")}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Clear & Mark On-Time
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Scheduled On-Time
                  </span>
                )}
              </div>

              {activeDelay && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>Transmitting Live: <strong>+{activeDelay.minutes} min delay</strong> ({activeDelay.reason}) to all passenger tracking maps.</span>
                  </div>
                  <button
                    onClick={() => handleReportDelay(0, "On time")}
                    className="px-2.5 py-1 rounded-lg bg-background text-foreground border border-border/80 text-xs font-bold shadow-xs hover:bg-secondary cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { min: 5, label: "+5m Traffic", reason: "Heavy Traffic Congestion" },
                  { min: 10, label: "+10m Signal", reason: "Traffic Signal Delays" },
                  { min: 15, label: "+15m Road Work", reason: "Road Works & Construction" },
                  { min: 30, label: "+30m Detour", reason: "Detour / Adverse Weather" },
                ].map((item) => {
                  const isCurrent = activeDelay?.minutes === item.min;
                  return (
                    <button
                      key={item.min}
                      type="button"
                      onClick={() => handleReportDelay(item.min, item.reason)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-95 cursor-pointer ${
                        isCurrent
                          ? "bg-red-500 text-white border-red-400 shadow-md shadow-red-500/20"
                          : "bg-secondary/70 hover:bg-primary hover:text-primary-foreground border-border/60 hover:border-primary"
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Waypoint Track / Route Stops Progress */}
            <div className="pt-6 border-t border-border/60 mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Route Waypoint Sequence ({activeTrip.route.stops.length} stations)
                </p>
                <span className="text-xs text-muted-foreground font-mono">
                  Waypoint {currentStopIndex + 1} of {activeTrip.route.stops.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {activeTrip.route.stops.map((rs: any, idx: number) => {
                  const isPassed = idx < currentStopIndex;
                  const isCurrent = idx === currentStopIndex;

                  return (
                    <div 
                      key={rs.stopId}
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
                        isCurrent 
                          ? 'bg-primary/10 border-primary text-foreground font-bold shadow-xs' 
                          : isPassed 
                            ? 'bg-secondary/40 border-border/40 text-muted-foreground' 
                            : 'bg-card border-border/60 text-foreground'
                      }`}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        {isPassed ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-[10px]">
                            {idx + 1}
                            <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-[10px] font-mono border">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="truncate font-semibold">{rs.stop?.name || "Station"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {isCurrent ? "Approaching / At Station" : isPassed ? "Departed" : "Upcoming"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Assigned Trips Roster */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">Assigned Transit Schedules</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select an assigned trip to initiate live satellite positioning simulation.
              </p>
            </div>
            {trips && trips.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary border border-border/60 text-muted-foreground">
                {trips.length} Trips Assigned
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Retrieving duty schedules...</p>
            </div>
          ) : trips?.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-2xl p-12 text-center shadow-xs space-y-4">
              <div className="mx-auto w-16 h-16 bg-secondary/80 rounded-2xl flex items-center justify-center border border-border/60">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-lg font-bold text-foreground">No Trips Assigned to Your Cockpit</h4>
                <p className="text-xs text-muted-foreground">
                  You currently have no scheduled trips. An administrator can assign upcoming trips to your coach from the Buzo Admin Command Center.
                </p>
              </div>
              <div>
                <a 
                  href="http://localhost:5174/trips"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Open Admin Trip Scheduler <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trips?.map((trip: any) => {
                const isActive = activeTrip?.id === trip.id;
                
                return (
                  <div 
                    key={trip.id} 
                    className={`bg-card rounded-2xl shadow-xs overflow-hidden transition-all duration-200 border ${
                      isActive 
                        ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/5' 
                        : 'border-border/60 hover:border-primary/50'
                    }`}
                  >
                    <div className={`px-5 py-4 border-b border-border/40 flex justify-between items-center ${
                      isActive ? 'bg-primary/10' : 'bg-secondary/20'
                    }`}>
                      <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <Bus className="w-4 h-4 text-primary" />
                        {trip.route.name}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        trip.status === 'IN_PROGRESS' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : trip.status === 'COMPLETED'
                            ? 'bg-muted text-muted-foreground border-border'
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {trip.status}
                      </span>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-xs bg-secondary/30 p-3 rounded-xl border border-border/40">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Scheduled Dep</p>
                          <p className="font-bold text-foreground mt-0.5">
                            {new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Coach</p>
                          <p className="font-mono font-bold text-foreground mt-0.5">
                            {trip.bus?.number || trip.busId}
                          </p>
                        </div>
                      </div>

                      {/* Stops list summary */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Route Stations ({trip.route.stops?.length || 0})
                        </p>
                        <div className="h-28 overflow-y-auto bg-secondary/30 rounded-xl p-2.5 border border-border/40 space-y-1 scrollbar-thin text-xs">
                          {trip.route.stops.map((rs: any, idx: number) => (
                            <div 
                              key={rs.stopId} 
                              className="flex items-center gap-2 py-0.5 text-muted-foreground"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                              <span className="truncate">{rs.stop?.name || `Stop ${idx + 1}`}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Simulation Trigger */}
                      <div className="pt-2">
                        {!isActive && !isSimulating ? (
                          <button 
                            onClick={() => startSimulation(trip)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-xs transition-all duration-150 active:scale-[0.98] shadow-sm cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5 fill-primary-foreground" /> Start Cockpit Simulation
                          </button>
                        ) : isActive ? (
                          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-center text-xs font-bold text-primary">
                            Active in Main Cockpit HUD Above ↑
                          </div>
                        ) : (
                          <button disabled className="w-full py-2.5 px-4 bg-secondary text-muted-foreground rounded-xl font-medium text-xs cursor-not-allowed">
                            Another trip active
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
