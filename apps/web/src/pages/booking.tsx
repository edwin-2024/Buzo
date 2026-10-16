import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Check, ShieldCheck, Loader2, Armchair, Bus, Sparkles, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/axios"
import { resolveSeatPricing } from "@/lib/seat-pricing"
import { useAuthStore } from "@/stores/auth.store"
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

export function BookingPage() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [step, setStep] = useState<"SEAT" | "PAYMENT">("SEAT")
  const [deck, setDeck] = useState<"ALL" | "LOWER" | "UPPER">("ALL")
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null)

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data } = await api.get(`/trips/${tripId}`)
      return data
    },
    enabled: !!tripId
  })

  const { data: seats, isLoading: seatsLoading } = useQuery({
    queryKey: ["seats", tripId],
    queryFn: async () => {
      const { data } = await api.get(`/trips/${tripId}/seats`)
      return data
    },
    enabled: !!tripId
  })

  const bookMutation = useMutation({
    mutationFn: async (seatIds: string[]) => {
      const { data } = await api.post("/bookings", {
        tripId,
        seatIds
      })
      return data
    },
    onSuccess: () => {
      toast.success("Seats reserved! Complete payment to confirm your booking.")
      navigate(`/payment?tripId=${tripId}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to book seats. They might have been taken.")
    }
  })

  const handleBook = () => {
    if (!user) {
      toast.error("Please login to complete your booking")
      navigate("/login")
      return
    }
    if (selectedSeats.length === 0) return
    
    bookMutation.mutate(selectedSeats)
  }

  if (tripLoading || seatsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="h-[480px] md:col-span-2 rounded-2xl" />
          <Skeleton className="h-80 md:col-span-1 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Trip Not Found</h2>
        <p className="text-muted-foreground mb-6">The requested trip could not be loaded or is no longer scheduled.</p>
        <Button onClick={() => navigate("/search")}>Return to Search</Button>
      </div>
    )
  }

  const selectedTotal = selectedSeats.reduce((sum, id) => {
    const s = seats?.find((seat: any) => seat.id === id)
    if (!s) return sum
    const pricing = resolveSeatPricing(s, s.seatNumber)
    return sum + pricing.price
  }, 0)

  const renderSeatButton = (num: number) => {
    const seat = seats?.find((s: any) => s.seatNumber === num)
    const isBooked = !seat || seat.status !== "AVAILABLE"
    const isSelected = seat && selectedSeats.includes(seat.id)
    const pricing = resolveSeatPricing(seat, num)
    const isFrontRow = num >= 1 && num <= 8
    const isWindow = (num % 4 === 1 || num % 4 === 0)

    return (
      <button
        key={num}
        type="button"
        disabled={isBooked}
        onMouseEnter={() => setHoveredSeat(num)}
        onMouseLeave={() => setHoveredSeat(prev => prev === num ? null : prev)}
        title={
          isBooked
            ? `Seat ${num} (Booked)`
            : `Seat ${num} • ${pricing.name} (₹${pricing.price})`
        }
        onClick={() => {
          if (!seat) return
          setSelectedSeats(prev =>
            prev.includes(seat.id)
              ? prev.filter(id => id !== seat.id)
              : [...prev, seat.id]
          )
        }}
        className={`
          relative w-11 h-13 rounded-t-xl rounded-b-md border-2 font-bold text-xs transition-all duration-150 flex flex-col items-center justify-center select-none
          ${isBooked
            ? "bg-muted/60 text-muted-foreground/30 border-muted/50 cursor-not-allowed"
            : isSelected
              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 scale-105 ring-2 ring-primary/40 cursor-pointer active:scale-95"
              : isFrontRow
                ? "border-amber-400/80 bg-amber-500/10 hover:border-amber-400 text-foreground hover:scale-105 shadow-xs cursor-pointer active:scale-95"
                : "bg-background/90 hover:border-primary/70 hover:bg-primary/10 border-input text-foreground hover:scale-105 cursor-pointer active:scale-95 shadow-2xs"}
        `}
      >
        {/* Front row premium gold sparkle indicator */}
        {isFrontRow && !isBooked && (
          <span className="absolute top-1 left-1 flex items-center pointer-events-none" title="Premium Front">
            <Sparkles className={`w-2.5 h-2.5 ${isSelected ? "text-primary-foreground/90 fill-primary-foreground/50" : "text-amber-500 fill-amber-500"}`} />
          </span>
        )}
        {/* Window indicator blue dot */}
        {isWindow && !isBooked && (
          <span
            className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full pointer-events-none ${isSelected ? "bg-white" : "bg-blue-500"}`}
            title="Window Seat"
          />
        )}
        <span className="leading-none">{num}</span>
        <span className="text-[9px] font-normal opacity-75 mt-0.5">₹{pricing.price}</span>
      </button>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              {trip.bus?.number || "Luxury Coach"}
            </Badge>
            <span className="text-sm text-muted-foreground font-medium">• 2+2 Semi-Sleeper</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {trip.route?.name || "Bus Journey"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${step === "SEAT" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            1. Select Seats
          </div>
          <span className="text-muted-foreground">→</span>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${step === "PAYMENT" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            2. Payment
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          
          {step === "SEAT" ? (
            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Armchair className="w-5 h-5 text-primary" /> Interactive Seat Selector
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Choose your preferred seats. Premium Front seats include extra legroom and priority deboarding.
                    </CardDescription>
                  </div>
                  <div className="hidden sm:flex bg-muted/60 p-1 rounded-xl text-xs font-medium border gap-0.5">
                    <button 
                      type="button"
                      onClick={() => setDeck("ALL")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${deck === "ALL" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      All Seats
                    </button>
                    <button 
                      type="button"
                      onClick={() => setDeck("LOWER")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${deck === "LOWER" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Lower Deck (1–20)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setDeck("UPPER")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${deck === "UPPER" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Upper Deck (21–40)
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Expanded Seat Legend */}
                <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-5 mb-8 text-xs font-medium bg-muted/20 py-3 px-4 rounded-xl border">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md border-2 border-input bg-background shadow-xs"></div>
                    <span>Available (Aisle ₹599)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-5 h-5 rounded-md border-2 border-input bg-background shadow-xs">
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    </div>
                    <span>Window (₹649)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-5 h-5 rounded-md border-2 border-amber-400/80 bg-amber-500/10 shadow-xs flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                    </div>
                    <span>Premium Front (₹699–₹749)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-muted border border-muted-foreground/20 opacity-60"></div>
                    <span>Booked</span>
                  </div>
                </div>

                {/* Interactive Seat Inspector Banner */}
                {(() => {
                  const activeNum = hoveredSeat || (selectedSeats.length > 0 ? seats?.find((s: any) => s.id === selectedSeats[selectedSeats.length - 1])?.seatNumber : null)
                  if (!activeNum) {
                    return (
                      <div className="max-w-md mx-auto mb-4 p-3 rounded-2xl bg-muted/30 border border-dashed text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                        <Armchair className="w-4 h-4 text-primary" />
                        <span>Hover or tap any seat to inspect pricing, legroom, and perks</span>
                      </div>
                    )
                  }
                  const activeSeat = seats?.find((s: any) => s.seatNumber === activeNum)
                  const isBooked = !activeSeat || activeSeat.status !== "AVAILABLE"
                  const isSelected = activeSeat && selectedSeats.includes(activeSeat.id)
                  const pricing = resolveSeatPricing(activeSeat, activeNum)

                  return (
                    <div className="max-w-md mx-auto mb-4 p-3.5 rounded-2xl bg-card border-2 border-primary/30 shadow-xs flex items-center justify-between animate-in fade-in">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-foreground">Seat {activeNum}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20">
                            {pricing.name}
                          </Badge>
                          {isBooked ? (
                            <Badge variant="destructive" className="text-[9px]">Booked</Badge>
                          ) : isSelected ? (
                            <Badge variant="default" className="text-[9px] bg-primary">Selected</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">Available</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-1">
                          {pricing.perks.map((perk, pI) => (
                            <span key={pI} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                              • {perk}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right pl-3 border-l shrink-0">
                        <span className="text-[10px] text-muted-foreground">Fare</span>
                        <div className="text-lg font-black text-primary">₹{pricing.price}</div>
                      </div>
                    </div>
                  )
                })()}
                
                {/* Realistic Bus Chassis */}
                <div className="max-w-md mx-auto bg-card border-2 border-border/80 rounded-4xl p-6 sm:p-8 pb-10 relative shadow-inner">
                   {/* Driver Cab Header */}
                   <div className="flex items-center justify-between border-b pb-4 mb-6 px-2 text-muted-foreground">
                     <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                       <Bus className="w-4 h-4 text-primary" /> Front of Bus
                     </div>
                     {/* Steering Wheel graphic */}
                     <div className="relative w-8 h-8 rounded-full border-3 border-muted-foreground/60 flex items-center justify-center shadow-xs">
                       <div className="w-2 h-2 rounded-full bg-muted-foreground/80"></div>
                       <div className="absolute w-full h-0.5 bg-muted-foreground/50"></div>
                       <div className="absolute h-full w-0.5 bg-muted-foreground/50"></div>
                     </div>
                   </div>
                   
                   {/* 2 + 2 Layout Grid */}
                   <div className="space-y-3.5">
                     {(deck === "LOWER"
                       ? [0, 1, 2, 3, 4]
                       : deck === "UPPER"
                       ? [5, 6, 7, 8, 9]
                       : Array.from({ length: 10 }, (_, i) => i)
                     ).map((rowIndex) => {
                       const seatStart = rowIndex * 4 + 1
                       const rowSeats = [seatStart, seatStart + 1, seatStart + 2, seatStart + 3]

                       return (
                         <div key={rowIndex} className="flex items-center justify-between gap-2 sm:gap-4 px-2">
                           {/* Left Pair */}
                           <div className="flex items-center gap-2 sm:gap-3">
                             {rowSeats.slice(0, 2).map(renderSeatButton)}
                           </div>

                           {/* Aisle Spacer */}
                           <div className="flex-1 flex items-center justify-center">
                             <div className="h-6 w-0.5 border-r border-dashed border-muted-foreground/20"></div>
                           </div>

                           {/* Right Pair */}
                           <div className="flex items-center gap-2 sm:gap-3">
                             {rowSeats.slice(2, 4).map(renderSeatButton)}
                           </div>
                         </div>
                       )
                     })}
                   </div>

                   {/* Rear Exit Indicator */}
                   <div className="mt-8 pt-4 border-t border-dashed flex justify-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                     Rear of Coach
                   </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t bg-muted/5 p-6">
                <div className="text-sm">
                  {selectedSeats.length > 0 ? (
                    <span className="font-semibold text-foreground">
                      {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""} selected (₹{selectedTotal})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No seats selected yet</span>
                  )}
                </div>
                <Button 
                  size="lg" 
                  disabled={selectedSeats.length === 0}
                  onClick={() => setStep("PAYMENT")}
                  className="font-semibold"
                >
                  Continue to Payment →
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-muted/10 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" /> Secure Checkout
                </CardTitle>
                <CardDescription>
                  Confirm passenger details and complete your reservation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start space-x-3 text-emerald-950 dark:text-emerald-200">
                  <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">Instant Ticket Confirmation</p>
                    <p className="opacity-90 mt-0.5">Your seat reservation and digital boarding pass will be generated immediately upon confirmation.</p>
                  </div>
                </div>
                
                {/* Breakdown Card */}
                <div className="border rounded-2xl p-6 bg-card space-y-4">
                  <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
                    Payment Breakdown
                  </div>
                  <div className="space-y-3 text-sm">
                    {selectedSeats.map(id => {
                      const s = seats?.find((seat: any) => seat.id === id)
                      if (!s) return null
                      const pricing = resolveSeatPricing(s, s.seatNumber)
                      const isFront = s.seatNumber >= 1 && s.seatNumber <= 8
                      return (
                        <div key={id} className="flex justify-between items-center py-1 border-b border-muted/50 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">Seat {s.seatNumber}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 font-medium ${
                                isFront
                                  ? "border-amber-400/80 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
                              }`}
                            >
                              {pricing.name}
                            </Badge>
                          </div>
                          <span className="font-semibold text-foreground">₹{pricing.price}</span>
                        </div>
                      )
                    })}
                    <div className="flex justify-between items-center pt-2 text-muted-foreground">
                      <span>Convenience Fee & Taxes</span>
                      <span className="text-emerald-600 font-medium">Free (Promotional)</span>
                    </div>
                  </div>
                  <div className="border-t pt-4 flex justify-between items-baseline">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Payable Amount</div>
                      <div className="text-3xl font-black text-primary mt-1">₹{selectedTotal}</div>
                    </div>
                    <Badge variant="outline" className="bg-muted font-medium">Test Payment Mode</Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t bg-muted/5 p-6">
                <Button variant="ghost" onClick={() => setStep("SEAT")}>
                  ← Back to Seats
                </Button>
                <Button 
                  size="lg" 
                  onClick={handleBook}
                  disabled={bookMutation.isPending}
                  className="font-bold px-8"
                >
                  {bookMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4 stroke-[3]" />}
                  Pay ₹{selectedTotal} & Confirm
                </Button>
              </CardFooter>
            </Card>
          )}
          
        </div>
        
        {/* Sidebar Summary */}
        <div className="md:col-span-1">
          <Card className="sticky top-24 border-2 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b pb-4">
              <CardTitle className="text-lg">Trip Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Route</div>
                <div className="font-bold text-base mt-0.5">{trip.route?.name}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-xl border">
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Departure</div>
                  <div className="font-bold text-sm text-foreground mt-0.5">
                    {new Date(trip.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(trip.departureTime).toLocaleDateString([], { month: 'short', day: 'numeric'})}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Arrival</div>
                  <div className="font-bold text-sm text-foreground mt-0.5">
                    {new Date(trip.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(trip.arrivalTime).toLocaleDateString([], { month: 'short', day: 'numeric'})}
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t space-y-2 text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Selected Seats</span>
                  <div className="text-right">
                    {selectedSeats.length > 0 ? (
                      <div className="flex flex-col items-end gap-1">
                        {selectedSeats.map(id => {
                          const s = seats?.find((seat: any) => seat.id === id)
                          if (!s) return null
                          const pricing = resolveSeatPricing(s, s.seatNumber)
                          return (
                            <div key={id} className="text-xs">
                              <span className="font-bold text-foreground">Seat {s.seatNumber}</span>
                              <span className="text-muted-foreground ml-1.5">(₹{pricing.price})</span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="font-bold">None</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bus Number</span>
                  <span className="font-semibold text-xs bg-muted px-2 py-0.5 rounded">{trip.bus?.number || "KA-01-BZ-102"}</span>
                </div>
                <div className="flex justify-between items-center font-extrabold text-base pt-3 border-t mt-3">
                  <span>Total Amount</span>
                  <span className="text-primary text-xl">₹{selectedTotal}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Bottom Action Bar for Mobile */}
      {step === "SEAT" && selectedSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t p-3.5 px-6 shadow-2xl flex items-center justify-between sm:hidden animate-in slide-in-from-bottom">
          <div>
            <span className="text-xs text-muted-foreground font-medium">{selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""} selected</span>
            <div className="text-xl font-black text-primary leading-tight">₹{selectedTotal}</div>
          </div>
          <Button onClick={() => setStep("PAYMENT")} className="font-bold rounded-xl shadow-md">
            Continue to Payment →
          </Button>
        </div>
      )}
    </div>
  )
}
