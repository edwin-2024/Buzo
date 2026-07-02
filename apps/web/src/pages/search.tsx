import { useSearchParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Clock, MapPin, CreditCard, ChevronRight } from "lucide-react"

import { api } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const source = searchParams.get("source")
  const destination = searchParams.get("destination")
  const dateStr = searchParams.get("date")

  // Normally we would have an endpoint specifically for searching trips between stops.
  // For now, we'll fetch all trips and filter them client-side if the backend doesn't support the query params yet.
  const { data: trips, isLoading, isError } = useQuery({
    queryKey: ["search", source, destination, dateStr],
    queryFn: async () => {
      // In a real app we'd pass source, destination, date to the API directly.
      const { data } = await api.get("/trips")
      return data as any[]
    },
    enabled: !!source && !!destination && !!dateStr
  })

  // Mock filtering since our backend `GET /trips` might not support `?source=X&destination=Y` yet
  const filteredTrips = trips?.filter((trip) => {
    // 1. Filter by date
    if (dateStr) {
      const tripDate = new Date(trip.departureTime).toISOString().split('T')[0]
      if (tripDate !== dateStr) return false
    }

    // 2. Filter by source/dest inside the route stops
    // (A real backend would do this!)
    if (source && destination && trip.route?.stops) {
      const stops = trip.route.stops
      const sourceStop = stops.find((s: any) => s.stopId === source)
      const destStop = stops.find((s: any) => s.stopId === destination)
      
      // Source must exist, dest must exist, and source must come BEFORE dest in the route
      if (!sourceStop || !destStop || sourceStop.order >= destStop.order) {
        return false
      }
    }

    return true
  })

  // Format time (e.g., "14:30")
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Calculate duration
  const getDuration = (start: string, end: string) => {
    const ms = new Date(end).getTime() - new Date(start).getTime()
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (!source || !destination || !dateStr) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Please select origin, destination, and date.</h2>
        <Button onClick={() => navigate("/")}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
        <p className="text-muted-foreground mt-2">
          Showing buses for {dateStr}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="md:col-span-1 space-y-6 hidden md:block">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Bus Type</h4>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="ac" className="rounded border-gray-300" />
                  <label htmlFor="ac" className="text-sm">AC Sleeper</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="non-ac" className="rounded border-gray-300" />
                  <label htmlFor="non-ac" className="text-sm">Non-AC Seater</label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="md:col-span-3 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="w-full">
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))
          ) : isError ? (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-6 text-center text-destructive">
                Failed to load trips. Please try again later.
              </CardContent>
            </Card>
          ) : filteredTrips?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-xl font-bold mb-2">No buses found</h3>
                <p className="text-muted-foreground mb-6">
                  We couldn't find any trips for this route on the selected date.
                </p>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Try another date or route
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredTrips?.map((trip: any) => (
              <Card key={trip.id} className="w-full transition-all hover:shadow-md border-border/50">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Time & Route Info */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{trip.route?.name}</h3>
                          <div className="text-sm text-muted-foreground flex items-center mt-1">
                            <span className="font-medium text-foreground">{trip.bus?.number}</span>
                            <span className="mx-2">•</span>
                            <span>{trip.bus?.capacity} Seats</span>
                          </div>
                        </div>
                        <Badge variant={trip.status === "SCHEDULED" ? "default" : "secondary"}>
                          {trip.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="text-center">
                          <div className="text-xl font-bold">{formatTime(trip.departureTime)}</div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center">
                            <MapPin className="mr-1 h-3 w-3" /> Origin
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center px-4 flex-1">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center">
                            <Clock className="mr-1 h-3 w-3" /> {getDuration(trip.departureTime, trip.arrivalTime)}
                          </div>
                          <div className="w-full relative flex items-center justify-center">
                            <div className="h-[2px] w-full bg-border"></div>
                            <div className="absolute h-2 w-2 rounded-full bg-primary/50"></div>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-xl font-bold">{formatTime(trip.arrivalTime)}</div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center">
                            <MapPin className="mr-1 h-3 w-3" /> Destination
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Price & Action */}
                    <div className="bg-muted/30 p-6 md:w-64 border-t md:border-t-0 md:border-l flex flex-col justify-between items-center md:items-end">
                      <div className="text-center md:text-right mb-4 md:mb-0">
                        <div className="text-sm text-muted-foreground mb-1">Starting from</div>
                        <div className="text-3xl font-bold text-primary">₹599</div>
                      </div>
                      
                      <Button 
                        size="lg" 
                        className="w-full"
                        onClick={() => navigate(`/booking/${trip.id}`)}
                      >
                        Select Seats <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
