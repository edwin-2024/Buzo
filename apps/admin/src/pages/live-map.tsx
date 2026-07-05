import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { io } from "socket.io-client"
import { MapIcon } from "lucide-react"

import { api } from "@/lib/axios"
import { useAuthStore } from "@/stores/auth.store"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Fix for default Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Bus Icon
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
})

export function LiveMapPage() {
  const { token } = useAuthStore()
  const [liveLocations, setLiveLocations] = useState<Record<string, any>>({})

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

    socket.on("bus-location-update", (data: { busId: string, location: { lat: number, lng: number } }) => {
      setLiveLocations(prev => ({
        ...prev,
        [data.busId]: {
          ...prev[data.busId],
          busId: data.busId,
          latitude: data.location.lat,
          longitude: data.location.lng,
          lastUpdated: new Date()
        }
      }))
    })

    return () => {
      socket.disconnect()
    }
  }, [token])

  const locationArray = Object.values(liveLocations)
  
  // Center map on Bangalore default or first bus
  const center = locationArray.length > 0 && locationArray[0].latitude
    ? [locationArray[0].latitude, locationArray[0].longitude] 
    : [12.9716, 77.5946]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Live Fleet Map</h2>
      </div>

      <Card className="h-[600px] flex flex-col border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden relative">
        <CardHeader className="absolute top-0 left-0 right-0 z-[1000] bg-background/80 backdrop-blur-md border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapIcon className="h-5 w-5 text-primary" />
            Real-time Tracking
          </CardTitle>
          <CardDescription>
            Live locations of {locationArray.length} active buses.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 relative">
          <MapContainer 
            center={center as [number, number]} 
            zoom={12} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {locationArray.map((loc: any) => {
              if (!loc.latitude || !loc.longitude) return null;
              
              return (
                <Marker 
                  key={loc.busId}
                  position={[loc.latitude, loc.longitude]} 
                  icon={busIcon}
                >
                  <Popup>
                    <strong>Bus ID: {loc.bus?.number || loc.busId.slice(-4)}</strong><br />
                    Speed: {loc.speed || 0} km/h<br />
                    {loc.lastUpdated && <span className="text-xs text-muted-foreground">Updated recently</span>}
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </CardContent>
      </Card>
    </div>
  )
}
