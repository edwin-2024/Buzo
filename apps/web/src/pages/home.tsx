import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { MapPin, Calendar as CalendarIcon, ArrowRight } from "lucide-react"
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
  const [date, setDate] = useState<Date>()

  const { data: stops } = useQuery({
    queryKey: ["stops"],
    queryFn: async () => {
      const { data } = await api.get("/stops")
      return data
    }
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!source || !destination || !date) {
      toast.error("Please fill in all search fields")
      return
    }
    
    if (source === destination) {
      toast.error("Source and destination cannot be the same")
      return
    }

    // Pass the stop IDs to the search page
    const dateStr = format(date, "yyyy-MM-dd")
    navigate(`/search?source=${source}&destination=${destination}&date=${dateStr}`)
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-muted/30">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 opacity-60"></div>
        </div>
        <div className="container relative mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="space-y-4 max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-foreground">
                Premium Bus Travel, Simplified.
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Book your tickets instantly, track your bus in real-time, and get AI-powered travel assistance.
              </p>
            </div>
            
            {/* Search Box */}
            <Card className="w-full max-w-4xl border-border/50 bg-background/95 backdrop-blur shadow-xl">
              <CardContent className="p-6">
                <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="source">Leaving from</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <select 
                        id="source"
                        className="flex h-9 w-full rounded-md border border-input bg-background text-foreground [&>option]:bg-background [&>option]:text-foreground pl-9 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                    <Label htmlFor="destination">Going to</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <select 
                        id="destination"
                        className="flex h-9 w-full rounded-md border border-input bg-background text-foreground [&>option]:bg-background [&>option]:text-foreground pl-9 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                    <Label htmlFor="date">Date of Travel</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-9 bg-background text-foreground border-input pl-9 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring relative",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Search Buses
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Live Tracking</h3>
              <p className="text-muted-foreground">
                Know exactly where your bus is at any moment with real-time GPS tracking. Never miss your ride again.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CalendarIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Instant Booking</h3>
              <p className="text-muted-foreground">
                Select your preferred seats and get your tickets instantly. Safe, secure, and lightning fast.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <ArrowRight className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">AI Assistant</h3>
              <p className="text-muted-foreground">
                Ask our smart chatbot to find the best routes or answer your travel queries 24/7.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
