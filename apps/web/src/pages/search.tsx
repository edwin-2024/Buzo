import { useSearchParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Bus, AlertCircle, Filter, Armchair } from "lucide-react"

import { api } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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

  const { data: stops } = useQuery({
    queryKey: ["stops"],
    queryFn: async () => {
      const { data } = await api.get("/stops")
      return data
    }
  })

  const { data: trips, isLoading, isError } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data } = await api.get("/trips")
      return data as any[]
    },
  })

  const sourceName = stops?.find((s: any) => s.id === source)?.name || "Origin"
  const destName = stops?.find((s: any) => s.id === destination)?.name || "Destination"

  // Generic multi-strategy trip filter
  const filteredTrips = trips?.filter((trip) => {
    // 1. If date is provided, filter by matching calendar date
    if (dateStr) {
      const tripDate = new Date(trip.departureTime).toISOString().split('T')[0]
      if (tripDate !== dateStr) return false
    }

    // 2. If source and destination stops are provided, match against route sequence
    if (source && destination && trip.route?.stops) {
      const routeStops = trip.route.stops
      const sourceStop = routeStops.find((s: any) => s.stopId === source)
      const destStop = routeStops.find((s: any) => s.stopId === destination)
      
      // Source must exist, dest must exist, and source must precede dest in order
      if (!sourceStop || !destStop || sourceStop.order >= destStop.order) {
        return false
      }
    }

    return true
  })

  // Format time (e.g. "06:30 AM")
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Format date readable
  const formatDateReadable = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })
  }

  // Calculate duration
  const getDuration = (start: string, end: string) => {
    const ms = new Date(end).getTime() - new Date(start).getTime()
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-card border rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <span>Route Search</span>
            {dateStr ? <span>• {dateStr}</span> : <span>• All Dates</span>}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <span>{source ? sourceName : "All Routes"}</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
            <span>{destination ? destName : "All Destinations"}</span>
          </h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/")} className="self-start sm:self-auto rounded-xl">
          Change Search
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <Card className="rounded-2xl border">
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> Filter Schedules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Date Filter</div>
                {dateStr ? (
                  <div className="flex items-center justify-between bg-primary/5 p-2 rounded-xl border border-primary/20">
                    <span className="font-semibold text-xs text-primary">{dateStr}</span>
                    <button 
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams)
                        newParams.delete("date")
                        navigate(`/search?${newParams.toString()}`)
                      }}
                      className="text-[11px] text-destructive hover:underline font-bold"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Showing buses for all available dates</span>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Coach Class</div>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" defaultChecked className="rounded border-input text-primary focus:ring-primary" />
                  <span>AC Semi-Sleeper (2+2)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" defaultChecked className="rounded border-input text-primary focus:ring-primary" />
                  <span>Express Shuttle</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Stream */}
        <div className="md:col-span-3 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-6">
                  <Skeleton className="h-28 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))
          ) : isError ? (
            <div className="text-center py-12 bg-card border rounded-2xl p-8">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <div className="font-bold text-lg">Unable to load schedules</div>
              <p className="text-muted-foreground text-sm mt-1">Please ensure the backend API is running.</p>
            </div>
          ) : filteredTrips && filteredTrips.length > 0 ? (
            filteredTrips.map((trip: any) => (
              <Card key={trip.id} className="hover:border-primary/50 transition-all rounded-2xl overflow-hidden shadow-xs hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    {/* Bus Info & Times */}
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-bold bg-primary/5 text-primary border-primary/20">
                          {trip.bus?.number || "Coach"}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">
                          {trip.route?.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {trip.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-6 items-center">
                        <div>
                          <div className="text-xl font-extrabold text-foreground">{formatTime(trip.departureTime)}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{formatDateReadable(trip.departureTime)}</div>
                        </div>

                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {getDuration(trip.departureTime, trip.arrivalTime)}
                          </span>
                          <div className="w-full flex items-center gap-1 my-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                            <div className="h-0.5 w-full bg-border"></div>
                            <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                          </div>
                          <span className="text-[10px] text-muted-foreground">Direct</span>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-extrabold text-foreground">{formatTime(trip.arrivalTime)}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{formatDateReadable(trip.arrivalTime)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex sm:flex-col justify-between sm:items-end w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground sm:text-right">Starting from</div>
                        <div className="text-2xl font-black text-primary">₹599</div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate(`/track?tripId=${trip.id}`)}
                          className="rounded-xl text-xs font-semibold"
                        >
                          Live Radar
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => navigate(`/booking/${trip.id}`)}
                          className="rounded-xl font-bold text-xs gap-1.5 shadow-sm"
                        >
                          <Armchair className="w-3.5 h-3.5" /> Select Seat
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-16 bg-card border rounded-2xl p-8 space-y-4">
              <Bus className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <div>
                <h3 className="text-lg font-bold">No buses found for this search</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  {dateStr 
                    ? `No departures scheduled exactly on ${dateStr}. Try clearing the date filter to see all upcoming trips.`
                    : "No buses match the selected origin and destination."}
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {dateStr && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams)
                      newParams.delete("date")
                      navigate(`/search?${newParams.toString()}`)
                    }}
                    className="rounded-xl font-semibold"
                  >
                    View All Dates
                  </Button>
                )}
                <Button onClick={() => navigate("/")} className="rounded-xl font-semibold">
                  Back to Search
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
