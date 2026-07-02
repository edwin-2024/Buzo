import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { MapPin, Calendar as CalendarIcon, ArrowRight } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/axios"

export function HomePage() {
  const navigate = useNavigate()
  const [source, setSource] = useState("")
  const [destination, setDestination] = useState("")
  const [date, setDate] = useState("")

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
    navigate(`/search?source=${source}&destination=${destination}&date=${date}`)
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-black">
        <div className="absolute inset-0 overflow-hidden">
          {/* We'll use a placeholder gradient instead of a real image for now */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-secondary/30 opacity-40"></div>
        </div>
        <div className="container relative mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="space-y-4 max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-white">
                Premium Bus Travel, Simplified.
              </h1>
              <p className="mx-auto max-w-[700px] text-zinc-300 md:text-xl">
                Book your tickets instantly, track your bus in real-time, and get AI-powered travel assistance.
              </p>
            </div>
            
            {/* Search Box */}
            <Card className="w-full max-w-4xl border-border/50 bg-background/95 backdrop-blur shadow-2xl">
              <CardContent className="p-6">
                <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="source">Leaving from</Label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <select 
                        id="source"
                        className="flex h-9 w-full rounded-md border border-input bg-background text-foreground pl-9 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                      <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <select 
                        id="destination"
                        className="flex h-9 w-full rounded-md border border-input bg-background text-foreground pl-9 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

                  <div className="space-y-2">
                    <Label htmlFor="date">Date of Travel</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        className="pl-9 bg-background text-foreground"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
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
