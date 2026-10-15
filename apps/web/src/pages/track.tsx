import { useEffect, useState, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"
import { 
  Navigation, 
  Clock, 
  Radio, 
  ChevronLeft, 
  AlertCircle,
  LocateFixed,
  AlertTriangle,
  Coffee
} from "lucide-react"

import { api } from "@/lib/axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

// Fix for default Leaflet marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom animated pulsing Bus Icon using HTML DivIcon
const createBusDivIcon = (busNumber: string, isLive: boolean, isOnBreak: boolean = false) => {
  const bgColor = isOnBreak ? "#d97706" : "#4f46e5";
  const ringColor = isOnBreak ? "#f59e0b" : "#4f46e5";
  return L.divIcon({
    className: "custom-bus-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          position: absolute;
          top: -24px;
          background: ${isOnBreak ? '#78350f' : '#0f172a'};
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          ${busNumber} ${isOnBreak ? '(PAUSED)' : ''}
        </div>
        <div style="
          width: 38px;
          height: 38px;
          background: ${bgColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px ${isOnBreak ? 'rgba(217, 119, 6, 0.45)' : 'rgba(79, 70, 229, 0.45)'};
          position: relative;
        ">
          ${isOnBreak ? `
            <svg style="width: 18px; height: 18px; color: white;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ` : `
            <svg style="width: 20px; height: 20px; color: white;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h8m-8 4h8m-6 4h4m-8 6h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm2-2a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
          `}
        </div>
        ${isLive && !isOnBreak ? `
          <div style="
            position: absolute;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 2px solid ${ringColor};
            top: -6px;
            animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          "></div>
        ` : ''}
      </div>
      <style>
        @keyframes pulse-ring {
          0% { transform: scale(0.65); opacity: 0.9; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      </style>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  })
}

// Custom Stop Pin Icon
const createStopDivIcon = (order: number, isFirst: boolean, isLast: boolean) => {
  const bg = isFirst ? "#10b981" : isLast ? "#ef4444" : "#1e293b"
  return L.divIcon({
    className: "custom-stop-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${bg};
        color: #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      ">
        ${order}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

// Component to dynamically re-center map
function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.panTo(center, { animate: true, duration: 1 })
  }, [center, map])
  return null
}

function MapFitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const hasFit = useRef(false)

  useEffect(() => {
    if (!hasFit.current && points.length > 1) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [60, 60] })
      hasFit.current = true
    }
  }, [points, map])

  return null
}

// Haversine formula to compute distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

interface DelayInfo {
  delayMinutes: number;
  reason?: string;
  timestamp: string;
}

interface BreakInfo {
  busId: string;
  tripId?: string;
  onBreak: boolean;
  reason?: string;
  timestamp: string;
}

export function TrackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tripId = searchParams.get("tripId")

  const [busLocation, setBusLocation] = useState<{lat: number, lng: number} | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const [followBus, setFollowBus] = useState(true)
  const [delayInfo, setDelayInfo] = useState<DelayInfo | null>(null)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakInfo, setBreakInfo] = useState<BreakInfo | null>(null)

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data } = await api.get(`/trips/${tripId}`)
      return data
    },
    enabled: !!tripId
  })

  // Fetch initial bus location
  useEffect(() => {
    if (!trip?.busId) return;
    api.get(`/buses/${trip.busId}/location`)
      .then(res => {
         if (res.data && res.data.latitude && res.data.longitude) {
           setBusLocation({ 
             lat: parseFloat(res.data.latitude), 
             lng: parseFloat(res.data.longitude) 
           });
           setLastUpdated(new Date(res.data.updatedAt || Date.now()));
         }
      })
      .catch(console.error);
  }, [trip?.busId]);

  // Setup Real-time Socket.IO connection
  useEffect(() => {
    if (!tripId || !trip?.busId) return

    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:3000"
    const socket: Socket = io(socketUrl, {
      reconnectionAttempts: 5,
      timeout: 10000,
    })

    socket.on("connect", () => {
      setIsSocketConnected(true)
      socket.emit("bus:join", trip.busId);
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false)
    });

    // Listen for room-based location updates from driver GPS broadcast
    socket.on("bus:location", (data: any) => {
      if (data && data.latitude && data.longitude) {
        setBusLocation({ 
          lat: parseFloat(data.latitude), 
          lng: parseFloat(data.longitude) 
        })
        setLastUpdated(new Date())
      }
    })

    // Listen for real-time bus delay alerts
    socket.on("bus:delay", (data: DelayInfo) => {
      if (data && typeof data.delayMinutes === "number") {
        setDelayInfo(data);
        if (data.delayMinutes > 0) {
          toast.warning(`Bus Delay Alert: +${data.delayMinutes} mins`, {
            description: data.reason || "Traffic delay reported on route.",
            duration: 8000,
          });
        } else {
          toast.success("Schedule Update: Bus is back on time!", { duration: 5000 });
        }
      }
    })

    // Listen for driver rest-break alerts
    socket.on("bus:break", (data: BreakInfo) => {
      if (data && typeof data.onBreak === "boolean") {
        setIsOnBreak(data.onBreak);
        setBreakInfo(data.onBreak ? data : null);
        if (data.onBreak) {
          toast.warning("Driver is on a rest break", {
            description: data.reason || "Bus is temporarily paused.",
            duration: 8000,
          });
        } else {
          toast.success("Trip resumed: Bus is back on route!", {
            duration: 5000,
          });
        }
      }
    })

    return () => {
      socket.emit("bus:leave", trip.busId);
      socket.off("bus:location");
      socket.off("bus:delay");
      socket.off("bus:break");
      socket.disconnect()
    }
  }, [tripId, trip])

  if (!tripId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Trip Selected</h2>
        <p className="text-muted-foreground mb-6">Select an active trip from your bookings to track your bus in real time.</p>
        <Button onClick={() => navigate("/my-bookings")}>Go to My Bookings</Button>
      </div>
    )
  }

  if (isLoading || !trip) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-full mb-4 rounded-xl" />
        <Skeleton className="h-[600px] w-full rounded-2xl" />
      </div>
    )
  }

  // Extract stops and construct GeoJSON coordinate line
  const routeStops = trip.route?.stops || trip.route?.routeStops || []
  const sortedStops = [...routeStops].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  
  const routePoints: [number, number][] = sortedStops
    .filter((s: any) => s.stop?.latitude && s.stop?.longitude)
    .map((s: any) => [parseFloat(s.stop.latitude), parseFloat(s.stop.longitude)])
  
  // Dynamic map center
  const center: [number, number] = (busLocation && followBus)
    ? [busLocation.lat, busLocation.lng]
    : (routePoints.length > 0 ? routePoints[0] : [12.9716, 77.5946])

  // Calculate Next Stop & ETA Estimation
  let nextStop: any = null
  let distanceToNextStop = 0
  let estimatedMinutes = 0

  if (busLocation && sortedStops.length > 0) {
    // Find closest or next upcoming stop
    let minDistance = Infinity
    for (const s of sortedStops) {
      if (!s.stop?.latitude || !s.stop?.longitude) continue
      const dist = calculateDistance(
        busLocation.lat,
        busLocation.lng,
        parseFloat(s.stop.latitude),
        parseFloat(s.stop.longitude)
      )
      if (dist < minDistance) {
        minDistance = dist
        nextStop = s
        distanceToNextStop = dist
      }
    }
    // Assume average speed 30 km/h in city traffic
    estimatedMinutes = Math.max(1, Math.round((distanceToNextStop / 30) * 60))
  }

  const totalDistance = sortedStops.length > 0
    ? (sortedStops[sortedStops.length - 1]?.distanceFromStart || 0)
    : 0
  const progressPercent = (totalDistance > 0 && nextStop?.distanceFromStart !== undefined)
    ? Math.min(100, Math.round((nextStop.distanceFromStart / totalDistance) * 100))
    : 0

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Top Banner Control Bar */}
      <div className="bg-background/95 backdrop-blur border-b p-4 px-6 shadow-sm z-20">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-xl shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
                  {trip.bus?.number || "Coach"}
                </Badge>
                <h1 className="text-xl font-extrabold tracking-tight">
                  {trip.route?.name || "Live Route"}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Radio className={`w-3.5 h-3.5 ${isSocketConnected ? "text-emerald-500 animate-pulse" : "text-amber-500"}`} />
                  {isSocketConnected ? "Real-time Telemetry Active" : "Connecting to Bus..."}
                </span>
                <span>•</span>
                {isOnBreak ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <Coffee className="w-3.5 h-3.5" /> Driver on Rest Break
                  </span>
                ) : lastUpdated ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Waiting for initial GPS fix</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end md:self-auto">
            <Button 
              variant={followBus ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFollowBus(!followBus)}
              className="rounded-xl font-semibold gap-1.5"
            >
              <LocateFixed className="w-4 h-4" />
              {followBus ? "Locked to Bus" : "Free Pan"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/booking/${tripId}`)}
              className="rounded-xl"
            >
              Seat Map
            </Button>
          </div>
        </div>
      </div>

      {/* Rest Break Banner */}
      {isOnBreak && (
        <div className="bg-amber-100 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-700 px-6 py-2.5 flex items-center justify-between text-amber-900 dark:text-amber-200 text-sm font-medium z-10 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>Driver on Break:</strong> Coach is temporarily paused {breakInfo?.reason ? `(${breakInfo.reason})` : 'for a rest break'}. Telemetry will resume shortly.
            </span>
          </div>
          {breakInfo?.timestamp && (
            <span className="text-xs text-amber-700 dark:text-amber-400 font-mono">
              {new Date(breakInfo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* Delay Notification Banner */}
      {delayInfo && delayInfo.delayMinutes > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-6 py-2.5 flex items-center justify-between text-amber-900 dark:text-amber-200 text-sm font-medium z-10 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
            <span>
              <strong>Trip Delayed:</strong> Expected +{delayInfo.delayMinutes} mins delay {delayInfo.reason ? `(${delayInfo.reason})` : ''}
            </span>
          </div>
          <span className="text-xs text-amber-700 dark:text-amber-400 font-mono">
            {new Date(delayInfo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Interactive Live Map Viewport */}
      <div className="flex-1 relative w-full h-full">
        <MapContainer 
          center={center} 
          zoom={13} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fit bounds to entire route on initial load */}
          <MapFitBounds points={routePoints} />

          {followBus && busLocation && <MapController center={[busLocation.lat, busLocation.lng]} />}
          
          {/* High-visibility Route Polyline */}
          {routePoints.length > 1 && (
            <>
              {/* Outer shadow glow */}
              <Polyline 
                positions={routePoints} 
                color="#312e81" 
                weight={8} 
                opacity={0.3} 
              />
              {/* Main track line */}
              <Polyline 
                positions={routePoints} 
                color="#4f46e5" 
                weight={5} 
                opacity={0.85} 
              />
            </>
          )}

          {/* Render Route Stops */}
          {sortedStops.map((s: any, idx: number) => {
            if (!s.stop?.latitude || !s.stop?.longitude) return null;
            const lat = parseFloat(s.stop.latitude);
            const lng = parseFloat(s.stop.longitude);
            const isFirst = idx === 0;
            const isLast = idx === sortedStops.length - 1;

            const distFromBus = busLocation ? calculateDistance(busLocation.lat, busLocation.lng, lat, lng) : null
            const etaFromBus = distFromBus ? Math.max(1, Math.round((distFromBus / 30) * 60)) : null

            return (
              <Marker 
                key={s.stopId || idx} 
                position={[lat, lng]}
                icon={createStopDivIcon(s.order || idx + 1, isFirst, isLast)}
              >
                <Popup className="custom-stop-popup">
                  <div className="p-1 min-w-[160px]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>{isFirst ? "Origin Station" : isLast ? "Final Destination" : `Stop ${s.order || idx + 1}`}</span>
                      {s.distanceFromStart !== undefined && (
                        <span className="font-mono text-[9px]">{s.distanceFromStart} km</span>
                      )}
                    </div>
                    <div className="font-extrabold text-sm text-foreground mt-0.5">{s.stop.name}</div>
                    {etaFromBus !== null && (
                      <div className="text-xs text-primary font-semibold mt-1.5 pt-1 border-t flex items-center gap-1">
                        <Clock className="w-3 h-3" /> ~{etaFromBus} min away ({distFromBus?.toFixed(1)} km)
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Render Moving Bus Marker */}
          {busLocation && (
            <Marker 
              position={[busLocation.lat, busLocation.lng]} 
              icon={createBusDivIcon(trip.bus?.number || "BUS", isSocketConnected, isOnBreak)}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="p-1">
                  <div className="text-xs font-bold uppercase text-primary">Live Bus Telemetry</div>
                  <div className="font-black text-base flex items-center gap-2">
                    {trip.bus?.number}
                    {isOnBreak && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        ON BREAK
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Latitude: {busLocation.lat.toFixed(4)}<br />
                    Longitude: {busLocation.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        
        {/* Floating Telemetry & ETA Dashboard */}
        <div className="absolute top-4 left-4 z-[1000] w-80 max-w-[calc(100vw-32px)]">
          <Card className="shadow-xl border-2 border-border/80 bg-background/95 backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" /> Live Journey Status
              </CardTitle>
              <div className="flex items-center gap-1.5">
                {isOnBreak && (
                  <Badge variant="outline" className="font-bold text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 flex items-center gap-1">
                    <Coffee className="w-2.5 h-2.5" /> ON BREAK
                  </Badge>
                )}
                {delayInfo && delayInfo.delayMinutes > 0 && (
                  <Badge variant="destructive" className="font-bold text-[10px] animate-pulse">
                    +{delayInfo.delayMinutes}m DELAY
                  </Badge>
                )}
                <Badge variant="outline" className="font-bold text-[10px] uppercase">
                  {trip.status || "SCHEDULED"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              {nextStop ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Next Upcoming Stop</span>
                    <span className="text-xs font-extrabold text-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" /> ~{estimatedMinutes + (delayInfo?.delayMinutes || 0)} mins
                    </span>
                  </div>
                  <div className="font-bold text-sm text-foreground mt-1">
                    {nextStop.stop?.name || "Next Station"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Approx. {distanceToNextStop.toFixed(1)} km away {isOnBreak ? "(Coach is paused)" : ""}
                  </div>
                </div>
              ) : (
                <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground">
                  Bus GPS is awaiting movement updates along the route.
                </div>
              )}

              {/* Route Completion Progress */}
              {totalDistance > 0 && (
                <div className="space-y-1 bg-muted/20 p-2.5 rounded-xl border">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Route Completed</span>
                    <span className="font-mono text-primary font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, progressPercent)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Waypoints Progress */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                  <span>Route Stops ({sortedStops.length})</span>
                  <span>{trip.bus?.capacity || 40} Seats Total</span>
                </div>
                <div className="max-h-36 overflow-y-auto pr-1 space-y-1 text-xs">
                  {sortedStops.map((s: any, i: number) => (
                    <div key={s.stopId || i} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-muted/30">
                      <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center font-bold text-[9px]">
                        {s.order || i + 1}
                      </span>
                      <span className="font-medium truncate">{s.stop?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
