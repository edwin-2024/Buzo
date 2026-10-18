import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { 
  MapPin, 
  Compass, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  ArrowLeftRight, 
  Check, 
  Search, 
  ShieldCheck, 
  Wifi, 
  VolumeX, 
  Armchair, 
  Maximize2, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Bus, 
  CheckCircle2, 
  X, 
  Radio, 
  BatteryCharging,
  Plane,
  Car
} from "lucide-react"
import { toast } from "sonner"
import { format, addDays } from "date-fns"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/axios"

interface Stop {
  id: string
  name: string
  latitude?: number
  longitude?: number
}

function getStationSubtext(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("airport") || lower.includes("kempegowda")) return "Aviation Hub · Direct Bay"
  if (lower.includes("majestic")) return "Central Intercity Terminal"
  if (lower.includes("whitefield")) return "Tech Corridor Terminal"
  if (lower.includes("electronic city")) return "South Expressway Station"
  if (lower.includes("mekhri")) return "North Arterial Express Bay"
  if (lower.includes("hebbal")) return "Ring Road Transit Interchange"
  if (lower.includes("sarjapur")) return "Tech District Hub"
  return "Buzo Executive Terminal"
}

interface StationSelectorProps {
  label: string
  placeholder: string
  value: string
  onChange: (id: string) => void
  stops: Stop[] | undefined
  icon: React.ReactNode
  id: string
}

function StationSelector({
  label,
  placeholder,
  value,
  onChange,
  stops,
  icon,
  id,
}: StationSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedStop = useMemo(
    () => stops?.find((s) => s.id === value),
    [stops, value]
  )

  const filteredStops = useMemo(() => {
    if (!stops) return []
    if (!search.trim()) return stops
    const q = search.toLowerCase()
    return stops.filter((s) => s.name.toLowerCase().includes(q))
  }, [stops, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "flex h-14 w-full items-center justify-between rounded-2xl border border-input bg-card px-4 text-left transition-all hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shadow-2xs group",
            open && "ring-2 ring-ring border-foreground/30"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
              {icon}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
                {label}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold truncate leading-tight mt-0.5",
                  selectedStop ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {selectedStop ? selectedStop.name : placeholder}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] sm:w-[360px] p-2 rounded-2xl border-border bg-popover text-popover-foreground shadow-2xl"
        align="start"
      >
        <div className="relative mb-2">
          <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terminal by name..."
            className="h-9 w-full rounded-xl border border-input bg-background pl-9 pr-8 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
          {filteredStops.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No terminals found
            </div>
          ) : (
            filteredStops.map((stop) => {
              const isSelected = stop.id === value
              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => {
                    onChange(stop.id)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "flex w-full items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer",
                    isSelected
                      ? "bg-secondary text-foreground font-semibold"
                      : "hover:bg-secondary/60 text-foreground"
                  )}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs font-semibold truncate leading-tight">
                      {stop.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {getStationSubtext(stop.name)}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const [source, setSource] = useState("")
  const [destination, setDestination] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [dateOpen, setDateOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const { data: stops } = useQuery<Stop[]>({
    queryKey: ["stops"],
    queryFn: async () => {
      const { data } = await api.get("/stops")
      return data
    },
  })

  const handleSwap = () => {
    if (!source && !destination) return
    const temp = source
    setSource(destination)
    setDestination(temp)
    toast.info("Origin & destination swapped", { duration: 1500 })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!source || !destination) {
      toast.error("Please select both origin and destination terminals")
      return
    }

    if (source === destination) {
      toast.error("Origin and destination cannot be the same terminal")
      return
    }

    const dateParam = date ? `&date=${format(date, "yyyy-MM-dd")}` : ""
    navigate(`/search?source=${source}&destination=${destination}${dateParam}`)
  }

  const setDatePreset = (daysFromToday: number) => {
    setDate(addDays(new Date(), daysFromToday))
  }

  const quickSelectRoute = (fromName: string, toName: string) => {
    const s = stops?.find((item) =>
      item.name.toLowerCase().includes(fromName.toLowerCase())
    )
    const d = stops?.find((item) =>
      item.name.toLowerCase().includes(toName.toLowerCase())
    )
    if (s && d) {
      setSource(s.id)
      setDestination(d.id)
      window.scrollTo({ top: 0, behavior: "smooth" })
      toast.info(`Loaded corridor: ${s.name} → ${d.name}`, { duration: 2000 })
    } else {
      navigate("/search")
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-16 md:py-24 lg:py-28 overflow-hidden bg-background border-b border-border/60">
        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center space-y-8 text-center max-w-4xl mx-auto">
            {/* Live Telemetry Ticker Pill */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-secondary/80 border border-border text-foreground text-xs font-medium shadow-2xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-mono text-[11px] font-semibold text-foreground">
                LIVE TELEMETRY
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground text-xs">
                Intercity executive coach network active
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl text-foreground leading-[1.08]">
                Intercity travel,{" "}
                <span className="font-serif italic font-normal text-muted-foreground">
                  recalibrated.
                </span>
              </h1>
              <p className="mx-auto max-w-[640px] text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
                Single-occupancy leather suites, whisper-quiet cabin acoustics, and 15-minute curbside departures. Executive comfort between downtown centers.
              </p>
            </div>

            {/* Concierge Search Bar */}
            <Card className="w-full max-w-4xl card-luxe rounded-3xl overflow-hidden mt-4 shadow-xl">
              <CardContent className="p-5 sm:p-7 space-y-5">
                <form onSubmit={handleSearch} className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-[1fr,auto,1fr,1fr] items-center text-left relative">
                    {/* Departure Terminal */}
                    <StationSelector
                      id="source"
                      label="Departure Terminal"
                      placeholder="Select origin terminal"
                      value={source}
                      onChange={setSource}
                      stops={stops}
                      icon={<MapPin className="h-4 w-4" />}
                    />

                    {/* Swap Button */}
                    <div className="flex items-center justify-center md:pb-0">
                      <button
                        type="button"
                        onClick={handleSwap}
                        title="Swap Origin & Destination"
                        className="h-10 w-10 rounded-full border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Destination Station */}
                    <StationSelector
                      id="destination"
                      label="Destination Terminal"
                      placeholder="Select arrival terminal"
                      value={destination}
                      onChange={setDestination}
                      stops={stops}
                      icon={<Compass className="h-4 w-4" />}
                    />

                    {/* Date Picker */}
                    <div className="relative">
                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger asChild>
                          <button
                            id="date"
                            type="button"
                            className={cn(
                              "flex h-14 w-full items-center justify-between rounded-2xl border border-input bg-card px-4 text-left transition-all hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shadow-2xs group",
                              dateOpen && "ring-2 ring-ring border-foreground/30"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                                <CalendarIcon className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
                                  Journey Date
                                </span>
                                <span
                                  className={cn(
                                    "text-sm font-semibold truncate leading-tight mt-0.5",
                                    date ? "text-foreground" : "text-muted-foreground"
                                  )}
                                >
                                  {date ? format(date, "EEE, MMM d") : "Flexible (Any date)"}
                                </span>
                              </div>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 rounded-2xl border-border bg-card shadow-2xl"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(selectedDate) => {
                              setDate(selectedDate)
                              setDateOpen(false)
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Date Quick Presets & Submit CTA */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-border/60">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground text-[11px] font-medium mr-1">
                        Quick date:
                      </span>
                      <button
                        type="button"
                        onClick={() => setDatePreset(0)}
                        className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground border border-border/80 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset(1)}
                        className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground border border-border/80 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset(3)}
                        className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground border border-border/80 text-xs font-medium transition-colors cursor-pointer"
                      >
                        In 3 days
                      </button>
                      {date && (
                        <button
                          type="button"
                          onClick={() => setDate(undefined)}
                          className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto h-12 px-7 font-bold text-sm rounded-xl gap-2 shadow-sm cursor-pointer"
                    >
                      <Bus className="w-4 h-4" /> Search Available Coaches
                    </Button>
                  </div>
                </form>

                {/* Popular Route Fast-Links */}
                {stops && stops.length > 0 && (
                  <div className="pt-3 border-t border-dashed border-border/60 flex flex-wrap items-center gap-2 text-xs text-left">
                    <span className="text-muted-foreground font-medium text-[11px]">
                      Popular corridors:
                    </span>
                    {[
                      {
                        label: "Airport Direct",
                        from: "Mekhri Circle",
                        to: "Kempegowda International Airport",
                      },
                      {
                        label: "Tech Corridor",
                        from: "Majestic",
                        to: "Whitefield",
                      },
                      {
                        label: "Silicon Expressway",
                        from: "Electronic City",
                        to: "Majestic",
                      },
                    ].map((route, rIdx) => {
                      const fromStop = stops.find((s) =>
                        s.name.toLowerCase().includes(route.from.toLowerCase())
                      )
                      const toStop = stops.find((s) =>
                        s.name.toLowerCase().includes(route.to.toLowerCase())
                      )
                      if (!fromStop || !toStop) return null

                      return (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => {
                            setSource(fromStop.id)
                            setDestination(toStop.id)
                          }}
                          className="px-3 py-1 rounded-full bg-secondary hover:bg-accent text-foreground border border-border text-[11px] font-medium transition-all text-left cursor-pointer"
                        >
                          {route.label} ({fromStop.name} → {toStop.name})
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 4 Factual Trust Pillars in Sentence Case */}
      <section className="border-b border-border/60 bg-card/40 py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col p-5 rounded-2xl bg-card border border-border space-y-2 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground mt-2">
                15-min curbside boarding
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Direct-to-coach departures from dedicated executive bays. Bypass crowded concourses, TSA lines, and terminal luggage carousels.
              </p>
            </div>

            <div className="flex flex-col p-5 rounded-2xl bg-card border border-border space-y-2 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Armchair className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground mt-2">
                Zero middle seats
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configured strictly in 1x1 and 1x2 private suite formats. Every passenger receives guaranteed unobstructed aisle access and direct windows.
              </p>
            </div>

            <div className="flex flex-col p-5 rounded-2xl bg-card border border-border space-y-2 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <VolumeX className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground mt-2">
                Quiet cabin protocol
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Calibrated acoustic isolation below 45dB. An enforced quiet zone policy allows uninterrupted rest, reading, or deep focus throughout.
              </p>
            </div>

            <div className="flex flex-col p-5 rounded-2xl bg-card border border-border space-y-2 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Wifi className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground mt-2">
                Starlink Wi-Fi
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Low-latency satellite connectivity standard at every suite. Stream video, join client conferences, and work without dead zones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Cabin Experience Showcase */}
      <section className="py-20 md:py-24 border-b border-border/60 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-14 text-left space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Physical Suite Engineering
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              The Cabin Experience
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Every curve, fabric choice, and acoustic seal is calibrated to eliminate intercity travel fatigue.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* 150° leather recliners */}
            <div className="flex flex-col justify-between p-7 rounded-3xl bg-card border border-border space-y-6 shadow-xs hover:border-foreground/20 transition-colors text-left">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <Armchair className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                    ERGONOMIC SUITE
                  </span>
                  <h3 className="text-xl font-bold text-foreground">
                    150° leather recliners
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Hand-stitched semi-aniline Italian leather with power leg rests and dual-zone lumbar support. Calibrated for zero-gravity resting angles that ease lower-back strain.
                </p>
              </div>
              <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-foreground shrink-0" />
                Motorized pneumatic recline controls
              </div>
            </div>

            {/* 48" pitch */}
            <div className="flex flex-col justify-between p-7 rounded-3xl bg-card border border-border space-y-6 shadow-xs hover:border-foreground/20 transition-colors text-left">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <Maximize2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                    PERSONAL ENVELOPE
                  </span>
                  <h3 className="text-xl font-bold text-foreground">
                    48" pitch personal envelope
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  More than double the legroom of domestic business aviation. No passenger in front reclines into your space, leaving your fold-out work table fully unobstructed.
                </p>
              </div>
              <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-foreground shrink-0" />
                Solid-surface fold-out executive desk
              </div>
            </div>

            {/* Quiet cabin <45dB */}
            <div className="flex flex-col justify-between p-7 rounded-3xl bg-card border border-border space-y-6 shadow-xs hover:border-foreground/20 transition-colors text-left">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <VolumeX className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                    ACOUSTIC SEALS
                  </span>
                  <h3 className="text-xl font-bold text-foreground">
                    Quiet cabin &lt;45dB
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Composite structural baffling, laminated acoustic double glazing, and air-suspension dampening reduce ambient highway noise to whisper level.
                </p>
              </div>
              <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-foreground shrink-0" />
                Sound-absorbing acoustic ceiling microfibers
              </div>
            </div>
          </div>

          {/* Suite Amenities Strip */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-secondary/50 border border-border text-left">
            <div className="flex items-center gap-3">
              <BatteryCharging className="w-4 h-4 text-foreground shrink-0" />
              <div>
                <div className="text-xs font-semibold text-foreground">65W USB-C PD</div>
                <div className="text-[10px] text-muted-foreground">At every suite seat</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-foreground shrink-0" />
              <div>
                <div className="text-xs font-semibold text-foreground">GPS Live Radar</div>
                <div className="text-[10px] text-muted-foreground">1-sec satellite telemetry</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-foreground shrink-0" />
              <div>
                <div className="text-xs font-semibold text-foreground">Zero Middle Seats</div>
                <div className="text-[10px] text-muted-foreground">1x1 and 1x2 private rows</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-foreground shrink-0" />
              <div>
                <div className="text-xs font-semibold text-foreground">Digital Boarding</div>
                <div className="text-[10px] text-muted-foreground">Optical pass & PDF tax bill</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Express Corridors */}
      <section className="py-20 md:py-24 border-b border-border/60 bg-card/20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4 text-left">
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                High-Frequency Network
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mt-1">
                Curated Express Corridors
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Executive multi-axle coaches departing around the clock with fixed upfront pricing.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="self-start sm:self-auto font-semibold rounded-xl text-xs gap-1.5 cursor-pointer"
              onClick={() => navigate("/search")}
            >
              Explore All Schedules <ArrowRight className="w-3.5 h-3.5" />
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
                busType: "Volvo 9600 Multi-Axle Suite",
                amenities: ["Starlink Wi-Fi", "150° Recline", "65W USB-C PD"]
              },
              {
                from: "Electronic City",
                to: "Majestic City Center",
                fromQuery: "Electronic City",
                toQuery: "Majestic",
                frequency: "Every 25 mins",
                fare: "₹649",
                tag: "Express Highway Line",
                busType: "Scania Metrolink Executive",
                amenities: ["Air Suspension", "Live GPS Radar", "Executive Desk"]
              },
              {
                from: "Mekhri Circle",
                to: "Kempegowda Int'l Airport",
                fromQuery: "Mekhri",
                toQuery: "Airport",
                frequency: "Hourly 24/7",
                fare: "₹799",
                tag: "Airport Direct Luxe",
                busType: "Mercedes-Benz Luxury Glider",
                amenities: ["Luggage Concierge", "Priority Curbside Bay", "Flight Radar"]
              },
            ].map((route, i) => (
              <Card 
                key={i} 
                className="group card-luxe card-luxe-hover cursor-pointer rounded-3xl overflow-hidden text-left" 
                onClick={() => quickSelectRoute(route.fromQuery, route.toQuery)}
              >
                <CardContent className="p-6 flex flex-col justify-between h-full space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="secondary" className="text-[10px] font-semibold tracking-wide">
                        {route.tag}
                      </Badge>
                      <span className="font-mono font-bold text-foreground text-xl tracking-tight">
                        {route.fare}
                      </span>
                    </div>

                    <div className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2 mt-2">
                      <span className="truncate">{route.from}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                      <span className="truncate">{route.to}</span>
                    </div>

                    <div className="text-xs text-muted-foreground font-normal mt-1">
                      {route.busType}
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <div className="flex flex-wrap gap-1.5">
                      {route.amenities.map((a, aIdx) => (
                        <span 
                          key={aIdx} 
                          className="text-[10px] font-medium text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-md flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 text-foreground" /> {a}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {route.frequency}
                      </span>
                      <span className="text-foreground font-semibold group-hover:underline flex items-center gap-1">
                        Select corridor →
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* The Buzo Difference Comparison Table */}
      <section className="py-20 md:py-24 border-b border-border/60 bg-background">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Direct Benchmark
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              The Buzo Difference
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              How executive road travel compares to short-haul aviation and legacy commercial coaches.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="p-4 sm:p-5 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Travel Dimension
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-foreground bg-secondary/80">
                    <div className="flex items-center gap-1.5">
                      <Bus className="w-4 h-4 text-foreground" />
                      <span>Buzo Executive</span>
                    </div>
                  </th>
                  <th className="p-4 sm:p-5 font-semibold text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Plane className="w-4 h-4 text-muted-foreground" />
                      <span>Regional Flights</span>
                    </div>
                  </th>
                  <th className="p-4 sm:p-5 font-semibold text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span>Commercial Buses</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">
                    Boarding & check-in
                  </td>
                  <td className="p-4 sm:p-5 font-semibold text-foreground bg-secondary/30">
                    15-min curbside bay departure
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    90–120 min TSA & bag drop
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    30–45 min crowded terminal
                  </td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">
                    Seat pitch & recline
                  </td>
                  <td className="p-4 sm:p-5 font-semibold text-foreground bg-secondary/30">
                    48" pitch · 150° power leather recline
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    30"–34" tight pitch · 10° recline
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    28"–31" pitch · limited manual recline
                  </td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">
                    Seating layout
                  </td>
                  <td className="p-4 sm:p-5 font-semibold text-foreground bg-secondary/30">
                    1x1 & 1x2 (Zero middle seats)
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    3x3 with middle seat squeeze
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    2x2 cramped bench layout
                  </td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">
                    Cabin sound ceiling
                  </td>
                  <td className="p-4 sm:p-5 font-semibold text-foreground bg-secondary/30">
                    &lt;45dB quiet protocol enforced
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    80–85dB engine drone
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    75–80dB highway & horn noise
                  </td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">
                    Wi-Fi & power delivery
                  </td>
                  <td className="p-4 sm:p-5 font-semibold text-foreground bg-secondary/30">
                    Free Starlink satellite + 65W USB-C
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    Paid / inconsistent in-flight Wi-Fi
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    Rarely functional · shared socket
                  </td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">
                    City connectivity
                  </td>
                  <td className="p-4 sm:p-5 font-semibold text-foreground bg-secondary/30">
                    Downtown-to-downtown direct
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    Peripheral airport + taxi transfers
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    Uncoordinated suburban stops
                  </td>
                </tr>

                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">
                    Fare transparency
                  </td>
                  <td className="p-4 sm:p-5 font-semibold text-foreground bg-secondary/30">
                    Upfront price · zero hidden fees
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    Base fare + bag + seat assignment fees
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    Unregulated holiday surge pricing
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-20 md:py-24 container mx-auto px-4 sm:px-6 max-w-3xl">
        <div className="text-center mb-12 space-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Clarity & Policies
          </span>
          <h2 className="text-3xl font-black tracking-tight text-foreground">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Can I choose my specific suite on the coach?",
              a: "Yes. Buzo features a live interactive seat selector. You can choose single window suites (1x1), companion suites (1x2), or front-row suites with extended legroom.",
            },
            {
              q: "How does real-time coach radar work?",
              a: "Every operating coach broadcasts live GPS coordinates via WebSockets once per second. You can track exact location, road speed, and up-to-the-minute station arrival ETAs directly from our tracking page.",
            },
            {
              q: "What is the quiet cabin protocol?",
              a: "To ensure all travelers can work or sleep undisturbed, phone calls are restricted to the designated forward vestibule. All cabin media is personal-audio-only with headphones.",
            },
            {
              q: "Do I need a printed ticket to board?",
              a: "No. Show your digital boarding pass with optical barcode on your mobile device. The coach captain will verify your reservation at the curbside door.",
            },
          ].map((faq, fIdx) => {
            const isOpen = openFaq === fIdx
            return (
              <div 
                key={fIdx}
                className="border border-border rounded-2xl bg-card overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : fIdx)}
                  className="w-full p-5 text-left font-semibold text-sm flex items-center justify-between gap-4 cursor-pointer hover:bg-secondary/40 transition-colors"
                >
                  <span className="text-foreground">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 shrink-0 text-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 md:py-20 bg-secondary/50 border-t border-border/60">
        <div className="container mx-auto px-4 sm:px-6 text-center space-y-5 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Reserve your suite for your next journey
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
            Search schedules across our express routes and secure your guaranteed private recliner in less than 60 seconds.
          </p>
          <div className="pt-2">
            <Button 
              size="lg" 
              className="h-12 px-8 font-bold text-sm rounded-xl cursor-pointer shadow-sm"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Start Searching Coaches →
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
