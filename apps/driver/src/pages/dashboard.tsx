import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { LogOut, Navigation, MapPin, Play, Square, Loader2, Coffee } from "lucide-react"
import { io, Socket } from "socket.io-client"

import { useAuthStore } from "../stores/auth.store"
import { api } from "../lib/axios"

export function DashboardPage() {
  const { user, logout, token } = useAuthStore()
  const navigate = useNavigate()
  
  const [activeTrip, setActiveTrip] = useState<any | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  
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

  const startSimulation = (trip: any) => {
    setActiveTrip(trip)
    setIsSimulating(true)
    setIsOnBreak(false)
    isOnBreakRef.current = false
    setCurrentStopIndex(0)
    
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
    
    // We will calculate total steps for the current segment dynamically
    let currentSegmentSteps = 0;
    
    simulationRef.current = setInterval(() => {
      // Pause advancing steps and skip location update API calls if driver is on break
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
        // Calculate steps needed for this segment on the first tick of the segment
        const distKm = getDistance(lat1, lng1, lat2, lng2);
        // Interval is 1s, so we travel SPEED_KMS km per tick
        // Minimum 1 step to avoid division by zero
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
         
         // Update UI to reflect the actual index in the original stops array
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
    setIsOnBreak(false)
    isOnBreakRef.current = false
    setIsSimulating(false)
    setActiveTrip(null)
    
    // Mark as completed
    api.patch(`/trips/${trip.id}`, { status: "COMPLETED" }).catch(console.error);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-md">
              <Navigation className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Buzo Driver</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Hello, <span className="text-foreground">{user?.name}</span></span>
            <button 
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Your Assigned Trips</h2>
          <p className="text-muted-foreground mt-1">Manage your schedules and broadcast live location to passengers.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : trips?.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-xl shadow-sm p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No Trips Assigned</h3>
            <p className="mt-1 text-muted-foreground">You don't have any upcoming trips scheduled at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trips?.map((trip: any) => {
               const isActive = activeTrip?.id === trip.id;
               
               return (
                <div key={trip.id} className={`bg-card rounded-xl shadow-sm overflow-hidden transition-all duration-200 border ${isActive ? 'border-primary ring-1 ring-primary' : 'border-border/50 hover:border-primary/50'}`}>
                  <div className={`px-5 py-4 border-b flex justify-between items-center ${isActive ? 'bg-primary/5' : 'bg-card'}`}>
                    <span className="font-semibold text-foreground">{trip.route.name}</span>
                    <div className="flex items-center gap-2">
                      {isActive && isOnBreak && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-1">
                          <Coffee className="h-3 w-3" /> On Break
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${trip.status === 'IN_PROGRESS' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'}`}>
                        {trip.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-muted-foreground font-medium mb-0.5">Departure</p>
                        <p className="font-semibold text-foreground">{new Date(trip.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground font-medium mb-0.5">Bus</p>
                        <p className="font-semibold text-foreground">{trip.bus?.number || trip.busId}</p>
                      </div>
                    </div>

                    {isActive && isOnBreak && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-2">
                        <Coffee className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>Driver rest break active. GPS updates paused.</span>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Route Stops</p>
                      <div className="h-40 overflow-y-auto bg-secondary/50 rounded-lg p-3 border border-border/50 space-y-1.5 scrollbar-thin">
                        {trip.route.stops.map((rs: any, idx: number) => (
                           <div key={rs.stopId} className={`flex items-center gap-3 text-sm p-1.5 rounded-md transition-colors ${isActive && idx === currentStopIndex ? 'bg-background shadow-sm border border-border/50 text-foreground font-medium' : 'text-muted-foreground'}`}>
                             <div className="relative flex items-center justify-center">
                               <div className={`w-2.5 h-2.5 rounded-full ${isActive && idx === currentStopIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                               {isActive && idx === currentStopIndex && (
                                 <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75"></div>
                               )}
                             </div>
                             {rs.stop.name}
                           </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      {!isActive && !isSimulating ? (
                        <button 
                          onClick={() => startSimulation(trip)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium transition-colors shadow-sm"
                        >
                          <Play className="h-4 w-4" /> Start Simulation
                        </button>
                      ) : isActive ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={toggleBreak}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md font-medium transition-colors shadow-sm text-sm ${
                              isOnBreak 
                                ? "bg-amber-600 hover:bg-amber-700 text-white" 
                                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30"
                            }`}
                          >
                            {isOnBreak ? (
                              <>
                                <Play className="h-4 w-4" /> Resume Driving
                              </>
                            ) : (
                              <>
                                <Coffee className="h-4 w-4" /> Take Break
                              </>
                            )}
                          </button>
                          <button 
                            onClick={() => stopSimulation(trip)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md font-medium transition-colors shadow-sm text-sm"
                          >
                            <Square className="h-4 w-4" /> End Trip
                          </button>
                        </div>
                      ) : (
                        <button disabled className="w-full py-2.5 px-4 bg-secondary text-muted-foreground rounded-md font-medium cursor-not-allowed">
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
      </main>
    </div>
  )
}
