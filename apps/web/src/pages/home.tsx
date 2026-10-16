import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { 
  MapPin, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  ArrowLeftRight, 
  Sparkles, 
  Bus, 
  ShieldCheck, 
  Clock, 
  Wifi, 
  Zap, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Compass, 
  BadgePercent,
  Radio
} from "lucide-react"
import { toast } from "sonner"
import { format, addDays } from "date-fns"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/axios"

export function HomePage() {
  const navigate = useNavigate()
  const [source, setSource] = useState("")
  const [destination, setDestination] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const { data: stops } = useQuery({
    queryKey: ["stops"],
    queryFn: async () => {
      const { data } = await api.get("/stops")
      return data
    }
  })

  const handleSwap = () => {
    if (!source && !destination) return
    const temp = source
    setSource(destination)
    setDestination(temp)
    toast.info("Origin & Destination swapped", { duration: 1500 })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!source || !destination) {
      toast.error("Please select both origin and destination stops")
      return
    }
    
    if (source === destination) {
      toast.error("Origin and destination cannot be the same station")
      return
    }

    const dateParam = date ? `&date=${format(date, "yyyy-MM-dd")}` : ""
    navigate(`/search?source=${source}&destination=${destination}${dateParam}`)
  }

  const setDatePreset = (daysFromToday: number) => {
    setDate(addDays(new Date(), daysFromToday))
  }

  const quickSearch = (fromName: string, toName: string) => {
    const sId = stops?.find((s: any) => s.name.toLowerCase().includes(fromName.toLowerCase()))?.id;
    const dId = stops?.find((s: any) => s.name.toLowerCase().includes(toName.toLowerCase()))?.id;
    if (sId && dId) {
      navigate(`/search?source=${sId}&destination=${dId}`);
    } else {
      navigate("/search");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-16 md:py-24 lg:py-32 overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
        {/* Ambient atmospheric backdrop */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/15 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 right-10 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center space-y-8 text-center max-w-4xl mx-auto">
            {/* Live Telemetry Ticker Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/80 border border-border/80 text-foreground text-xs font-semibold shadow-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-mono text-emerald-400">LIVE TELEMETRY:</span>
              <span className="text-muted-foreground">High-Precision Intercity Fleet Monitored in Real-Time</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" /> First-Class Intercity Mobility
              </div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.08]">
                Executive Coach Travel,{" "}
                <span className="bg-gradient-to-r from-sky-400 via-primary to-indigo-400 bg-clip-text text-transparent">
                  Redefined.
                </span>
              </h1>
              <p className="mx-auto max-w-[680px] text-muted-foreground text-base sm:text-lg md:text-xl font-normal leading-relaxed">
                Experience airline-grade executive comfort on the road. Select your exact recliner, follow satellite GPS radar, and glide to your destination effortlessly.
              </p>
            </div>
            
            {/* Search Console Card - Flighty Luxe Treatment */}
            <Card className="w-full max-w-4xl card-luxe rounded-3xl overflow-hidden mt-4 border-white/10 shadow-2xl">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <form onSubmit={handleSearch} className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-[1fr,auto,1fr,1fr] items-end text-left relative">
                    {/* Origin Stop */}
                    <div className="space-y-2">
                      <Label htmlFor="source" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> Departure Terminal
                      </Label>
                      <div className="relative">
                        <select 
                          id="source"
                          className="flex h-12 w-full rounded-xl border border-input bg-background/80 text-foreground px-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer hover:border-primary/50 shadow-2xs"
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          required
                        >
                          <option value="" disabled>Select origin station</option>
                          {stops?.map((stop: any) => (
                            <option key={stop.id} value={stop.id}>{stop.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Swap Button */}
                    <div className="hidden md:flex items-center justify-center pb-1">
                      <button
                        type="button"
                        onClick={handleSwap}
                        title="Swap Origin & Destination"
                        className="w-10 h-10 rounded-full border border-border bg-secondary/80 hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all duration-150 flex items-center justify-center cursor-pointer active:scale-90 shadow-xs"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Destination Stop */}
                    <div className="space-y-2">
                      <Label htmlFor="destination" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-rose-500" /> Destination Station
                      </Label>
                      <div className="relative">
                        <select 
                          id="destination"
                          className="flex h-12 w-full rounded-xl border border-input bg-background/80 text-foreground px-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer hover:border-primary/50 shadow-2xs"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          required
                        >
                          <option value="" disabled>Select destination station</option>
                          {stops?.map((stop: any) => (
                            <option key={stop.id} value={stop.id}>{stop.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-2 flex flex-col">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-primary" /> Journey Date
                        </Label>
                        {date && (
                          <button 
                            type="button" 
                            onClick={() => setDate(undefined)} 
                            className="text-[10px] text-primary hover:underline font-bold"
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
                              "w-full justify-start text-left font-semibold h-12 rounded-xl bg-background/80 text-foreground border-input pl-10 relative shadow-2xs",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                            {date ? format(date, "EEE, MMM d") : <span>All Dates (Flexible)</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-border bg-card shadow-2xl" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Date Quick Presets & Submit CTA */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-semibold">Quick Date:</span>
                      <button
                        type="button"
                        onClick={() => setDatePreset(0)}
                        className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground border border-border/60 font-semibold transition-colors cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset(1)}
                        className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground border border-border/60 font-semibold transition-colors cursor-pointer"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset(3)}
                        className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground border border-border/60 font-semibold transition-colors cursor-pointer"
                      >
                        In 3 Days
                      </button>
                    </div>

                    <Button type="submit" size="lg" className="w-full sm:w-auto h-12 px-8 font-bold gap-2 text-sm rounded-xl shadow-lg shadow-primary/25">
                      <Bus className="w-4 h-4" /> Search Available Coaches
                    </Button>
                  </div>
                </form>

                {/* Popular Route Fast-Links */}
                {stops && stops.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-border/60 flex flex-wrap items-center gap-2 text-xs text-left">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Popular Express Lines:
                    </span>
                    {[
                      { label: "Airport Direct", from: "Mekhri Circle", to: "Kempegowda International Airport" },
                      { label: "Tech Corridor", from: "Majestic", to: "Whitefield" },
                      { label: "Silicon Expressway", from: "Electronic City", to: "Majestic" }
                    ].map((route, rIdx) => {
                      const fromStop = stops.find((s: any) => s.name.toLowerCase().includes(route.from.toLowerCase()))
                      const toStop = stops.find((s: any) => s.name.toLowerCase().includes(route.to.toLowerCase()))
                      if (!fromStop || !toStop) return null

                      return (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => {
                            setSource(fromStop.id)
                            setDestination(toStop.id)
                          }}
                          className="px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 font-bold transition-all text-left cursor-pointer"
                        >
                          {route.label} ({fromStop.name} → {toStop.name})
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3 Core Trust Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full pt-2">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/80 text-left shadow-xs backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-foreground">Tiered Seat Map</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Pick exact window, aisle, or premium front recliner</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/80 text-left shadow-xs backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-foreground">1-Sec GPS Radar</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Watch your bus navigate traffic with real-time ETA updates</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/80 text-left shadow-xs backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <BadgePercent className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-foreground">Zero Hidden Surcharges</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Instant booking confirmation and digital tax invoice</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Popular Commutes Section */}
      <section className="py-20 container mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
              High-Frequency Networks
            </div>
            <h2 className="text-3xl font-black tracking-tight text-foreground">Popular Daily Routes</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Executive AC multi-axle coaches departing around the clock with live telemetry.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="self-start sm:self-auto font-bold rounded-xl"
            onClick={() => navigate("/search")}
          >
            Explore All Routes <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              from: "Majestic Terminal",
              to: "Whitefield IT Park",
              fromQuery: "Majestic",
              toQuery: "Whitefield",
              frequency: "Every 20 mins",
              fare: "₹599",
              tag: "Tech Corridor Express",
              busType: "Volvo Multi-Axle AC",
              amenities: ["WiFi", "USB Power", "Ergonomic Recline"]
            },
            {
              from: "Electronic City",
              to: "Majestic City Center",
              fromQuery: "Electronic City",
              toQuery: "Majestic",
              frequency: "Every 30 mins",
              fare: "₹649",
              tag: "Express Highway Line",
              busType: "Scania Premium Semi-Sleeper",
              amenities: ["WiFi", "Live GPS", "Air Suspension"]
            },
            {
              from: "Mekhri Circle",
              to: "Kempegowda Int'l Airport",
              fromQuery: "Mekhri",
              toQuery: "Airport",
              frequency: "Hourly 24/7",
              fare: "₹799",
              tag: "Airport Direct Luxe",
              busType: "Mercedes-Benz Luxury Sleeper",
              amenities: ["Luggage Bay", "USB-C Fast Charge", "Priority Bay"]
            },
          ].map((r, i) => (
            <Card 
              key={i} 
              className="group card-luxe card-luxe-hover cursor-pointer rounded-3xl overflow-hidden" 
              onClick={() => quickSearch(r.fromQuery, r.toQuery)}
            >
              <CardContent className="p-6 flex flex-col justify-between h-full space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/25">
                      {r.tag}
                    </Badge>
                    <span className="font-black text-primary text-xl tracking-tight">{r.fare}</span>
                  </div>

                  <div className="font-black text-lg text-foreground flex items-center gap-2.5 mt-2">
                    <span className="truncate">{r.from}</span>
                    <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
                    <span className="truncate">{r.to}</span>
                  </div>

                  <div className="text-xs text-muted-foreground font-medium mt-1">
                    {r.busType}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-1.5">
                    {r.amenities.map((a, aIdx) => (
                      <span key={aIdx} className="text-[10px] font-semibold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> {a}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {r.frequency}
                    </span>
                    <span className="text-primary font-bold group-hover:underline">
                      Reserve Seat →
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* The Buzo Standard Experience Showcase */}
      <section className="py-20 bg-muted/20 border-y border-border/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Precision Transit Engineering
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Built for Modern Commuters
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Every detail engineered from scratch to remove booking friction and keep you informed.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="p-8 rounded-3xl bg-card border border-border/70 space-y-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                <Wifi className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Executive Amenities Standard</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All long-distance coaches are equipped with verified onboard high-speed Wi-Fi, individual USB-C power ports, and climate-controlled suspension.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border/70 space-y-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Real-Time Telemetry Radar</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Drivers continually broadcast GPS coordinates. Watch your coach glide toward the station with up-to-the-minute traffic delay notifications.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border/70 space-y-4 shadow-sm hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Digital Boarding & PDF Invoices</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Receive an encrypted digital boarding pass with quick optical barcode and printable PDF invoices generated immediately after checkout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-20 container mx-auto px-4 sm:px-6 max-w-4xl">
        <div className="text-center mb-12 space-y-2">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Help & Clarity</span>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Can I choose my specific seat on the bus?",
              a: "Yes! Buzo features a live interactive seat selector. You can choose lower deck recliners, upper deck sleeper berths, or premium front-row seats with extra legroom."
            },
            {
              q: "How does the live bus tracking work?",
              a: "Every active driver application broadcasts live telemetry coordinates via WebSockets every second. You can view the coach location, speed, and next stop ETA directly on our interactive map."
            },
            {
              q: "How do I cancel my booking if my plans change?",
              a: "You can cancel any booking with a single click from the My Bookings page. Cancelled seats are immediately released back to other travelers."
            },
            {
              q: "Do I need a printed ticket to board?",
              a: "No! Present your digital boarding pass on your mobile device. The driver will verify the optical barcode and seat number at the door."
            }
          ].map((faq, fIdx) => {
            const isOpen = openFaq === fIdx
            return (
              <div 
                key={fIdx}
                className="border border-border/70 rounded-2xl bg-card overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : fIdx)}
                  className="w-full p-5 text-left font-bold text-sm sm:text-base flex items-center justify-between gap-4 cursor-pointer hover:text-primary transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-primary" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/40 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-primary/20 via-blue-600/10 to-indigo-600/20 border-t border-border/60">
        <div className="container mx-auto px-4 sm:px-6 text-center space-y-6 max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Ready for your next journey?
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Search schedules across 14 major intercity routes and secure your guaranteed seat in less than 60 seconds.
          </p>
          <div className="pt-2">
            <Button size="lg" className="h-12 px-8 font-bold text-sm rounded-xl shadow-xl shadow-primary/30" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Start Searching Buses →
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
