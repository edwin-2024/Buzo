import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { io } from "socket.io-client"
import { 
  MapIcon, 
  Bus as BusIcon, 
  Coffee, 
  AlertTriangle, 
  Clock, 
  Gauge, 
  Navigation, 
  Radio
} from "lucide-react"

import { api } from "@/lib/axios"
import { busesApi } from "@/api/buses"
import { useAuthStore } from "@/stores/auth.store"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Fix for default Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Dynamic SVG Bus Icon with Status Color
const createBusDivIcon = (busNumber: string, onBreak: boolean, delayMinutes: number, heading = 0) => {
  const bg = onBreak ? "#d97706" : delayMinutes > 0 ? "#ef4444" : "#2563eb"
  return L.divIcon({
    className: "admin-bus-marker",
    html: `
      <div style="position: relative; width: 42px; height: 42px; display: flex; items-center; justify-content: center;">
        <div title="Bus ${busNumber}" style="
          width: 38px;
          height: 38px;
          background: ${bg};
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transform: rotate(${heading}deg);
          transition: transform 0.4s ease;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"></path>
            <path d="M15 6v6"></path>
            <path d="M2 12h19.6"></path>
            <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.6-.5-1-1.1-1H3.1c-.6 0-1.1.4-1.1 1 0 .4.1.8.2 1.2l.8 2.8h3"></path>
            <path d="M4 6V5c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v1"></path>
            <circle cx="7" cy="18" r="2"></circle>
            <circle cx="17" cy="18" r="2"></circle>
          </svg>
        </div>
        ${!onBreak ? `
          <div style="
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 2px solid ${bg};
            top: -3px;
            left: -3px;
            animation: bus-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            pointer-events: none;
          "></div>
        ` : ''}
      </div>
      <style>
        @keyframes bus-ping {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      </style>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -21],
  })
}

// Map Controller for smooth panning
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, Math.max(map.getZoom(), 13), { duration: 1 })
    }
  }, [center, map])
  return null
}

export function LiveMapPage() {
  const { token } = useAuthStore()
  const [liveLocations, setLiveLocations] = useState<Record<string, any>>({})
  const [busStatuses, setBusStatuses] = useState<Record<string, { onBreak?: boolean; delayMinutes?: number; delayReason?: string }>>({})
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null)
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null)

  // Fetch all registered buses
  const { data: buses } = useQuery({
    queryKey: ["buses"],
    queryFn: busesApi.getAll,
  })

  // Fetch initial locations
  const { data: initialLocations } = useQuery({
    queryKey: ["bus-locations"],
    queryFn: async () => {
      const { data } = await api.get("/buses/locations")
      return data
    }
  })

  useEffect(() => {
    if (initialLocations) {
      const locMap: Record<string, any> = {}
      initialLocations.forEach((loc: any) => {
        locMap[loc.busId] = loc
      })
      setLiveLocations(locMap)
    }
  }, [initialLocations])

  // Setup Socket.IO connection
  useEffect(() => {
    const socket = io("http://localhost:3000", {
      auth: { token }
    })

    socket.on("bus-location-update", (data: any) => {
      if (!data?.busId || !data?.location) return
      setLiveLocations(prev => ({
        ...prev,
        [data.busId]: {
          ...prev[data.busId],
          busId: data.busId,
          latitude: data.location.lat,
          longitude: data.location.lng,
          speed: data.speed,
          heading: data.heading,
          bus: data.bus || prev[data.busId]?.bus,
          lastUpdated: new Date()
        }
      }))
    })

    socket.on("bus:delay", (data: { busId: string; delayMinutes: number; reason?: string }) => {
      if (!data?.busId) return
      setBusStatuses(prev => ({
        ...prev,
        [data.busId]: {
          ...prev[data.busId],
          delayMinutes: data.delayMinutes,
          delayReason: data.reason
        }
      }))
    })

    socket.on("bus:break", (data: { busId: string; onBreak: boolean; reason?: string }) => {
      if (!data?.busId) return
      setBusStatuses(prev => ({
        ...prev,
        [data.busId]: {
          ...prev[data.busId],
          onBreak: data.onBreak
        }
      }))
    })

    return () => {
      socket.disconnect()
    }
  }, [token])

  const locationArray = Object.values(liveLocations)
  
  // Center map on Bangalore default or first bus
  const defaultCenter: [number, number] = locationArray.length > 0 && locationArray[0].latitude
    ? [parseFloat(locationArray[0].latitude), parseFloat(locationArray[0].longitude)] 
    : [12.9716, 77.5946]

  // Telemetry metrics
  const activeBusesCount = locationArray.length
  const movingBusesCount = locationArray.filter(l => (l.speed || 0) > 0 && !busStatuses[l.busId]?.onBreak).length
  const onBreakCount = Object.values(busStatuses).filter(s => s.onBreak).length
  const delayedCount = Object.values(busStatuses).filter(s => (s.delayMinutes || 0) > 0).length

  const handleFocusBus = (busId: string, lat?: number, lng?: number) => {
    setSelectedBusId(busId)
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setSelectedCoords([lat, lng])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Fleet Radar</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time GPS telemetry, vehicle speeds, and dispatch delay alerts.
          </p>
        </div>

        {/* Quick Fleet Health Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs">
            <Radio className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
            {activeBusesCount} Active Vehicles
          </Badge>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 text-xs">
            <Navigation className="w-3.5 h-3.5 mr-1.5" />
            {movingBusesCount} In Transit
          </Badge>
          {onBreakCount > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1 text-xs">
              <Coffee className="w-3.5 h-3.5 mr-1.5" />
              {onBreakCount} On Break
            </Badge>
          )}
          {delayedCount > 0 && (
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 px-3 py-1 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
              {delayedCount} Delayed
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map View */}
        <Card className="lg:col-span-3 h-[620px] flex flex-col border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden relative rounded-2xl">
          <CardHeader className="absolute top-0 left-0 right-0 z-[1000] bg-background/85 backdrop-blur-md border-b px-4 py-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <MapIcon className="h-4 w-4 text-primary" />
              Fleet Positioning Grid
            </CardTitle>
            <span className="text-xs text-muted-foreground font-mono">
              Socket: CONNECTED
            </span>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative">
            <MapContainer 
              center={defaultCenter} 
              zoom={12} 
              scrollWheelZoom={true} 
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <MapController center={selectedCoords} />
              
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {locationArray.map((loc: any) => {
                if (!loc.latitude || !loc.longitude) return null
                const lat = parseFloat(loc.latitude)
                const lng = parseFloat(loc.longitude)
                if (isNaN(lat) || isNaN(lng)) return null

                const busInfo = buses?.find((b: any) => b.id === loc.busId) || loc.bus
                const busNumber = busInfo?.number || loc.busId.slice(-4)
                const plate = busInfo?.plateNumber || "KA-01-EXP"
                const status = busStatuses[loc.busId] || {}
                const isOnBreak = !!status.onBreak
                const delayMinutes = status.delayMinutes || 0
                const speed = loc.speed || 0
                
                return (
                  <Marker 
                    key={loc.busId}
                    position={[lat, lng]} 
                    icon={createBusDivIcon(busNumber, isOnBreak, delayMinutes, loc.heading || 0)}
                  >
                    <Popup className="rounded-xl">
                      <div className="p-1 space-y-2 min-w-[180px]">
                        <div className="flex items-center justify-between border-b pb-1">
                          <strong className="text-sm font-bold text-foreground">Bus {busNumber}</strong>
                          <span className="text-[10px] font-mono text-muted-foreground">{plate}</span>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-primary" /> Speed:
                            </span>
                            <span className="font-semibold">{isOnBreak ? "0 km/h (Break)" : `${speed} km/h`}</span>
                          </div>

                          {delayMinutes > 0 && (
                            <div className="flex items-center justify-between text-red-600 font-semibold">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Delay:
                              </span>
                              <span>+{delayMinutes}m</span>
                            </div>
                          )}

                          {isOnBreak && (
                            <div className="flex items-center justify-between text-amber-600 font-semibold">
                              <span className="flex items-center gap-1">
                                <Coffee className="w-3 h-3" /> Status:
                              </span>
                              <span>Rest Break</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-1 border-t text-[10px] text-muted-foreground">
                          Ping: {new Date(loc.lastUpdated || Date.now()).toLocaleTimeString()}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </CardContent>
        </Card>

        {/* Fleet Sidebar */}
        <Card className="h-[620px] flex flex-col border-border/50 bg-card shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BusIcon className="w-4 h-4 text-primary" />
              Fleet Roster ({buses?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto space-y-2 scrollbar-thin">
            {buses?.map((bus: any) => {
              const loc = liveLocations[bus.id]
              const status = busStatuses[bus.id] || {}
              const hasGps = loc && loc.latitude && loc.longitude
              const isSelected = selectedBusId === bus.id
              const isOnBreak = !!status.onBreak
              const delay = status.delayMinutes || 0

              return (
                <div 
                  key={bus.id}
                  onClick={() => hasGps && handleFocusBus(bus.id, parseFloat(loc.latitude), parseFloat(loc.longitude))}
                  className={`p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                    isSelected 
                      ? 'border-primary ring-1 ring-primary bg-primary/5' 
                      : 'border-border/60 hover:border-primary/50 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                      <BusIcon className="w-3.5 h-3.5 text-primary" />
                      {bus.number}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] px-1.5 py-0 ${
                        isOnBreak 
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                          : delay > 0 
                            ? 'bg-red-500/10 text-red-600 border-red-500/20' 
                            : hasGps 
                              ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                              : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isOnBreak ? "BREAK" : delay > 0 ? `+${delay}m DELAY` : hasGps ? "LIVE" : "IDLE"}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <div className="flex justify-between">
                      <span>Plate:</span>
                      <span className="font-mono font-medium text-foreground">{bus.plateNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Capacity:</span>
                      <span className="font-medium text-foreground">{bus.capacity} seats</span>
                    </div>
                    {hasGps && (
                      <div className="flex justify-between text-primary font-medium pt-1 border-t border-border/40 mt-1">
                        <span>Speed: {loc.speed || 0} km/h</span>
                        <span>Click to locate →</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

