import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { io } from "socket.io-client"
import { Bus } from "lucide-react"

import { api } from "@/lib/axios"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Fix for default Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Bus Icon
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // A free bus icon url
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
})

export function TrackPage() {
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get("tripId")

  const [busLocation, setBusLocation] = useState<{lat: number, lng: number} | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data } = await api.get(`/trips/${tripId}`)
      return data
    },
    enabled: !!tripId
  })

  // Setup Socket.IO connection
  useEffect(() => {
    if (!tripId || !trip?.busId) return

    // Connect to the backend Socket.io server
    const socket = io("http://localhost:3000", {
      // Pass token if needed for auth
    })

    // Listen for general location updates, but filter by our busId
    socket.on("bus-location-update", (data: { busId: string, location: { lat: number, lng: number } }) => {
      if (data.busId === trip.busId) {
        setBusLocation(data.location)
        setLastUpdated(new Date())
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [tripId, trip])

  if (!tripId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">No Trip Selected</h2>
        <p className="text-muted-foreground">Go to My Bookings to track your trip.</p>
      </div>
    )
  }

  if (isLoading || !trip) {
    return <div className="text-center py-12">Loading trip details...</div>
  }

  // Derive route path from stops for drawing the polyline
  const sortedStops = [...trip.route.stops].sort((a: any, b: any) => a.order - b.order)
  const routePoints = sortedStops
    .filter((s: any) => s.stop && s.stop.latitude && s.stop.longitude)
    .map((s: any): [number, number] => [
      parseFloat(s.stop.latitude), 
      parseFloat(s.stop.longitude)
    ])
  
  // Map center defaults to the first stop, or bus location if available
  const center = busLocation 
    ? [busLocation.lat, busLocation.lng] 
    : (routePoints.length > 0 ? routePoints[0] : [12.9716, 77.5946]) // Default Bangalore

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="bg-background border-b p-4 shadow-sm z-10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center">
                <Bus className="mr-2 h-5 w-5 text-primary" />
                Live Tracking: {trip.route?.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center">
                 <span className="font-semibold text-foreground mr-2">{trip.bus?.number}</span>
                 {lastUpdated ? (
                   <span className="text-green-500 text-xs">● Live (Updated {lastUpdated.toLocaleTimeString()})</span>
                 ) : (
                   <span className="text-yellow-500 text-xs">● Waiting for GPS signal...</span>
                 )}
              </p>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => {
            alert(`Bus Details:\nNumber: ${trip.bus?.number}\nCapacity: ${trip.bus?.capacity} Seats\nStatus: ${trip.status}`)
          }}>
            View Bus Details
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer 
          center={center as [number, number]} 
          zoom={13} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Draw Route Line */}
          {routePoints.length > 1 && (
            <Polyline 
              positions={routePoints} 
              color="#4f46e5" 
              weight={5} 
              opacity={0.7} 
            />
          )}

          {/* Draw Stops */}
          {sortedStops.map((s: any, i: number) => {
            if (!s.stop || !s.stop.latitude || !s.stop.longitude) return null;
            return (
              <Marker 
                key={s.stopId} 
                position={[parseFloat(s.stop.latitude), parseFloat(s.stop.longitude)]}
              >
                <Popup>
                  <strong>{s.stop.name}</strong><br />
                  Stop {i + 1}
                </Popup>
              </Marker>
            );
          })}

          {/* Draw Live Bus */}
          {busLocation && (
            <Marker 
              position={[busLocation.lat, busLocation.lng]} 
              icon={busIcon}
              zIndexOffset={1000}
            >
              <Popup>
                <strong>{trip.bus?.number}</strong><br />
                Current Location
              </Popup>
            </Marker>
          )}
        </MapContainer>
        
        {/* Floating Overlay Card */}
        <Card className="absolute bottom-6 left-6 z-[1000] w-64 shadow-lg border-border/50 bg-background/90 backdrop-blur">
          <CardContent className="p-4">
            <h4 className="font-bold text-sm mb-2">Trip Status</h4>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">{trip.status}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-muted-foreground">Departure</span>
              <span className="font-medium">{new Date(trip.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
