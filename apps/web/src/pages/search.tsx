import { useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { 
  ChevronRight, 
  Bus, 
  AlertCircle, 
  Filter, 
  Armchair, 
  ArrowUpDown, 
  Clock, 
  Sun, 
  Sunset, 
  Moon, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  RotateCcw
} from "lucide-react"

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

  const [sortBy, setSortBy] = useState<"departure" | "duration" | "availability">("departure")
  const [timeWindow, setTimeWindow] = useState<"ALL" | "MORNING" | "AFTERNOON" | "EVENING">("ALL")
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)

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

  // Multi-strategy trip filter
  const filteredTrips = trips?.filter((trip) => {
    // 1. Calendar date filter
    if (dateStr) {
      const tripDate = format(new Date(trip.departureTime), "yyyy-MM-dd")
      if (tripDate !== dateStr) return false
    }

    // 2. Source / destination sequence filter
    const routeStops = trip.route?.stops || trip.route?.routeStops || []
    if (source && destination) {
      const sourceStop = routeStops.find((s: any) => s.stopId === source)
      const destStop = routeStops.find((s: any) => s.stopId === destination)
      
      if (!sourceStop || !destStop || sourceStop.order >= destStop.order) {
        return false
      }
    } else if (source) {
      const hasSource = routeStops.some((s: any) => s.stopId === source)
      if (!hasSource) return false
    } else if (destination) {
      const hasDest = routeStops.some((s: any) => s.stopId === destination)
      if (!hasDest) return false
    }

    // 3. Time of day filter
    if (timeWindow !== "ALL") {
      const depHour = new Date(trip.departureTime).getHours()
      if (timeWindow === "MORNING" && (depHour < 6 || depHour >= 12)) return false
      if (timeWindow === "AFTERNOON" && (depHour < 12 || depHour >= 18)) return false
      if (timeWindow === "EVENING" && (depHour < 18 || depHour >= 24)) return false
    }

    return true
  }) || []

  // Multi-criteria sorting
  const sortedTrips = [...filteredTrips].sort((a, b) => {
    if (sortBy === "departure") {
      return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
    }
    if (sortBy === "duration") {
      const durA = new Date(a.arrivalTime).getTime() - new Date(a.departureTime).getTime()
      const durB = new Date(b.arrivalTime).getTime() - new Date(b.departureTime).getTime()
      return durA - durB
    }
    if (sortBy === "availability") {
      const seatsA = a.seats?.filter((s: any) => s.status === "AVAILABLE").length ?? 0
      const seatsB = b.seats?.filter((s: any) => s.status === "AVAILABLE").length ?? 0
      return seatsB - seatsA
    }
    return 0
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

  const toggleTripExpand = (tripId: string) => {
    setExpandedTripId(prev => prev === tripId ? null : tripId)
  }

  const hasActiveFilters = dateStr || timeWindow !== "ALL"

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-card border rounded-3xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <span>Route Search</span>
            {dateStr ? <span>• {dateStr}</span> : <span>• All Upcoming Dates</span>}
            <span>• {sortedTrips.length} Bus{sortedTrips.length === 1 ? "" : "es"} Available</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <span>{source ? sourceName : "All Routes"}</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
            <span>{destination ? destName : "All Destinations"}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setTimeWindow("ALL")
                if (dateStr) {
                  const newParams = new URLSearchParams(searchParams)
                  newParams.delete("date")
                  navigate(`/search?${newParams.toString()}`)
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-xl"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/")} className="rounded-xl font-semibold">
            Change Route
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Filters & Sorting Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <Card className="rounded-2xl border shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> Filter & Sort
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5 text-sm">
              {/* Sort By Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-primary" /> Sort By
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: "departure", label: "Earliest Departure" },
                    { id: "duration", label: "Fastest Trip" },
                    { id: "availability", label: "Most Seats Available" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSortBy(option.id as any)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        sortBy === option.id
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time of Day Filter */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Departure Time
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTimeWindow("ALL")}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium text-center transition-all ${
                      timeWindow === "ALL"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Any Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeWindow("MORNING")}
                    className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      timeWindow === "MORNING"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sun className="w-3 h-3" /> 06:00–12:00
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeWindow("AFTERNOON")}
                    className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      timeWindow === "AFTERNOON"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sunset className="w-3 h-3" /> 12:00–18:00
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeWindow("EVENING")}
                    className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      timeWindow === "EVENING"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Moon className="w-3 h-3" /> 18:00–24:00
                  </button>
                </div>
              </div>

              {/* Date Filter pill */}
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date Restriction</div>
                {dateStr ? (
                  <div className="flex items-center justify-between bg-primary/10 p-2.5 rounded-xl border border-primary/20">
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
                  <span className="text-xs text-muted-foreground">Showing departures on all upcoming dates</span>
                )}
              </div>

              {/* Perks summary */}
              <div className="space-y-1.5 pt-2 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Live GPS radar on all trips
                </div>
                <div className="flex items-center gap-1.5">
                  <Armchair className="w-3.5 h-3.5 text-primary" /> Dynamic tiered seat selection
                </div>
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
          ) : sortedTrips.length > 0 ? (
            sortedTrips.map((trip: any) => {
              const routeStops = trip.route?.stops || trip.route?.routeStops || []
              const totalSeats = trip.bus?.capacity || 40
              const availableSeats = trip.seats?.filter((s: any) => s.status === "AVAILABLE").length ?? totalSeats
              const isExpanded = expandedTripId === trip.id
              const seatPercent = Math.round((availableSeats / totalSeats) * 100)

              return (
                <Card key={trip.id} className="group card-luxe card-luxe-hover rounded-3xl overflow-hidden border-white/10">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                      {/* Bus Info & Times */}
                      <div className="space-y-4 flex-1 w-full">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Badge variant="outline" className="font-extrabold text-xs bg-primary/10 text-primary border-primary/25 px-2.5 py-0.5">
                            {trip.bus?.number || "Coach"}
                          </Badge>
                          <span className="text-base font-black text-foreground">
                            {trip.route?.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                            • Volvo Multi-Axle Luxe
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] font-bold px-2 py-0.5 ${
                                availableSeats > 10
                                  ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25"
                                  : availableSeats > 0
                                  ? "text-amber-500 bg-amber-500/10 border-amber-500/25"
                                  : "text-destructive bg-destructive/10 border-destructive/25"
                              }`}
                            >
                              {availableSeats > 0 ? `${availableSeats} seats available` : "Sold Out"}
                            </Badge>
                            {availableSeats > 0 && (
                              <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden hidden sm:inline-block border border-border/60" title={`${seatPercent}% seats left`}>
                                <div 
                                  className={`h-full transition-all ${availableSeats > 10 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                  style={{ width: `${Math.min(100, Math.max(8, seatPercent))}%` }} 
                                />
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                            {trip.status}
                          </Badge>
                        </div>

                        {/* Origin to Destination line */}
                        {routeStops.length >= 2 && (
                          <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                            <span className="text-foreground font-bold">{routeStops[0]?.stop?.name}</span>
                            <span className="text-primary font-bold">→</span>
                            <span className="text-foreground font-bold">{routeStops[routeStops.length - 1]?.stop?.name}</span>
                            <span className="text-muted-foreground font-mono">({routeStops.length} stops)</span>
                          </div>
                        )}

                        {/* Time Grid with Visual Timeline Connector */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-6 items-center pt-1 bg-secondary/30 p-3.5 rounded-2xl border border-border/50">
                          <div>
                            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Departure</div>
                            <div className="text-2xl font-black text-foreground mt-0.5">{formatTime(trip.departureTime)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 font-medium">{formatDateReadable(trip.departureTime)}</div>
                          </div>

                          <div className="flex flex-col items-center">
                            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1">
                              {getDuration(trip.departureTime, trip.arrivalTime)}
                            </span>
                            <div className="w-full flex items-center gap-1 my-0.5">
                              <div className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/20 shrink-0"></div>
                              <div className="h-0.5 w-full bg-border border-t border-dashed border-muted-foreground/40"></div>
                              <div className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0"></div>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">Non-Stop Express</span>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Arrival</div>
                            <div className="text-2xl font-black text-foreground mt-0.5">{formatTime(trip.arrivalTime)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 font-medium">{formatDateReadable(trip.arrivalTime)}</div>
                          </div>
                        </div>

                        {/* Amenities & Seat Availability Gauge */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground text-[10px] font-semibold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-primary" /> High-Speed WiFi
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground text-[10px] font-semibold flex items-center gap-1">
                              <Armchair className="w-3 h-3 text-primary" /> Ergonomic Recline
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground text-[10px] font-semibold flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-500" /> GPS Radar
                            </span>
                          </div>

                          {/* Intermediate Stops Toggle */}
                          {routeStops.length > 2 && (
                            <button
                              type="button"
                              onClick={() => toggleTripExpand(trip.id)}
                              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" /> Hide {routeStops.length - 2} stops
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" /> View {routeStops.length - 2} stops
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Price & Action Box */}
                      <div className="flex sm:flex-col justify-between sm:items-end w-full lg:w-48 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:pl-6 border-border/60 gap-4 shrink-0">
                        <div className="lg:text-right">
                          <div className="text-[11px] font-semibold text-muted-foreground">Standard Fare</div>
                          <div className="text-3xl font-black text-primary leading-tight">₹599</div>
                          <div className="text-[10px] text-muted-foreground">Taxes & fees included</div>
                        </div>
                        <div className="flex flex-row lg:flex-col gap-2 w-full sm:w-auto">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/track?tripId=${trip.id}`)}
                            className="rounded-xl text-xs font-bold h-10 w-full"
                          >
                            Live Radar
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => navigate(`/booking/${trip.id}`)}
                            disabled={availableSeats === 0}
                            className="rounded-xl font-bold text-xs gap-1.5 h-10 w-full shadow-md shadow-primary/20"
                          >
                            <Armchair className="w-3.5 h-3.5" /> Select Seat
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Stops Timeline Drawer */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-dashed space-y-3 bg-muted/20 p-4 rounded-2xl animate-in fade-in">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary" /> Route Stops & Distance
                        </div>
                        <div className="space-y-2 relative pl-3 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                          {routeStops.map((s: any, idx: number) => {
                            const isFirst = idx === 0
                            const isLast = idx === routeStops.length - 1
                            return (
                              <div key={s.stopId || idx} className="flex items-center gap-3 relative text-xs">
                                <div className={`w-2.5 h-2.5 rounded-full z-10 shrink-0 ${
                                  isFirst ? "bg-emerald-500" : isLast ? "bg-rose-500" : "bg-primary"
                                }`} />
                                <span className={`font-semibold ${isFirst || isLast ? "text-foreground" : "text-muted-foreground"}`}>
                                  {s.stop?.name}
                                </span>
                                {s.distanceFromStart !== undefined && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {s.distanceFromStart} km
                                  </span>
                                )}
                                {isFirst && <Badge variant="outline" className="text-[9px] py-0 px-1">Origin</Badge>}
                                {isLast && <Badge variant="outline" className="text-[9px] py-0 px-1">Final Destination</Badge>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <div className="text-center py-16 bg-card border rounded-3xl p-8 space-y-4">
              <Bus className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <div>
                <h3 className="text-lg font-bold">No buses found for this filter</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  {dateStr 
                    ? `No departures match your selected time or date (${dateStr}). Try expanding your filters.`
                    : "No buses match the selected origin, destination, or time window."}
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {hasActiveFilters && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setTimeWindow("ALL")
                      const newParams = new URLSearchParams(searchParams)
                      newParams.delete("date")
                      navigate(`/search?${newParams.toString()}`)
                    }}
                    className="rounded-xl font-semibold"
                  >
                    Reset All Filters
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
