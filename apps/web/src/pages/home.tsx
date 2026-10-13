import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { MapPin, Calendar as CalendarIcon, ArrowRight, Sparkles, Bus, ShieldCheck, Clock } from "lucide-react"
import { toast } from "sonner"

import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/axios"

export function HomePage() {
  const navigate = useNavigate()
  const [source, setSource] = useState("")
  const [destination, setDestination] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())

  const { data: stops } = useQuery({
    queryKey: ["stops"],
    queryFn: async () => {
      const { data } = await api.get("/stops")
      return data
    }
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!source || !destination) {
      toast.error("Please select both origin and destination")
      return
    }
    
    if (source === destination) {
      toast.error("Origin and destination cannot be the same stop")
      return
    }

    // Generic date support: if user picks a date, pass it, otherwise search all upcoming schedules
    const dateParam = date ? `&date=${format(date, "yyyy-MM-dd")}` : ""
    navigate(`/search?source=${source}&destination=${destination}${dateParam}`)
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-40 bg-muted/30">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 opacity-70"></div>
        </div>
        <div className="container relative mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="space-y-4 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Next-Gen Bus Reservation System
              </div>
              <h1 className="text-3xl font-extrabold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl text-foreground">
                Smart Bus Travel, Simplified.
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Book tickets with real-time seat selection, track buses with live GPS radar, and reach your destination with ease.
              </p>
            </div>
            
            {/* Search Box */}
            <Card className="w-full max-w-4xl border-2 border-border/80 bg-background/95 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-4 items-end text-left">
                  <div className="space-y-2">
                    <Label htmlFor="source" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leaving from</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-primary" />
                      <select 
                        id="source"
                        className="flex h-11 w-full rounded-xl border border-input bg-background text-foreground pl-10 pr-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-medium"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        required
                      >
                        <option value="" disabled>Select origin</option>
                        {stops?.map((stop: any) => (
                          <option key={stop.id} value={stop.id}>{stop.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="destination" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Going to</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-rose-500" />
                      <select 
                        id="destination"
                        className="flex h-11 w-full rounded-xl border border-input bg-background text-foreground pl-10 pr-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-medium"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        required
                      >
                        <option value="" disabled>Select destination</option>
                        {stops?.map((stop: any) => (
                          <option key={stop.id} value={stop.id}>{stop.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-col">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date (Optional)</Label>
                      {date && (
                        <button 
                          type="button" 
                          onClick={() => setDate(undefined)} 
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Any Date
                        </button>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-medium h-11 rounded-xl bg-background text-foreground border-input pl-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          {date ? format(date, "EEE, MMM d") : <span>All Dates (Flexible)</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button type="submit" size="lg" className="w-full h-11 rounded-xl font-bold gap-2 text-sm shadow-md">
                    <Bus className="w-4 h-4" /> Find Available Buses
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full pt-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-background/60 border text-left shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Guaranteed Seats</div>
                  <div className="text-xs text-muted-foreground">Live interactive seat map selection</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-background/60 border text-left shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Real-time Telemetry</div>
                  <div className="text-xs text-muted-foreground">Live GPS radar & accurate stop ETAs</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-background/60 border text-left shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Instant Confirmation</div>
                  <div className="text-xs text-muted-foreground">Immediate digital ticket issuance</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Popular Routes Section */}
      <section className="py-16 container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Popular Daily Commutes</h2>
            <p className="text-sm text-muted-foreground mt-1">High-frequency express routes with live tracking available.</p>
          </div>
          <Button variant="ghost" className="hidden sm:flex items-center gap-1 font-semibold" onClick={() => navigate("/search")}>
            Explore All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            { from: "Majestic", to: "Whitefield", time: "Every 20 mins", price: "₹599", tag: "Tech Express" },
            { from: "Electronic City", to: "Majestic", time: "Every 30 mins", price: "₹649", tag: "Fast Shuttle" },
            { from: "Airport Express", to: "Central City", time: "Hourly", price: "₹799", tag: "AC Luxury" },
          ].map((r, i) => (
            <Card key={i} className="hover:border-primary/50 transition-all cursor-pointer rounded-2xl overflow-hidden shadow-xs hover:shadow-md" onClick={() => navigate("/search")}>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {r.tag}
                  </span>
                  <span className="font-bold text-primary text-base">{r.price}</span>
                </div>
                <div className="font-extrabold text-base flex items-center gap-2">
                  <span>{r.from}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{r.to}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {r.time}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
