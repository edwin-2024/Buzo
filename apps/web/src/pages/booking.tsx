import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Check, ShieldCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/axios"
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

export function BookingPage() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [step, setStep] = useState<"SEAT" | "PAYMENT">("SEAT")

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      // In a real app we'd have GET /trips/:id
      const { data } = await api.get("/trips")
      return data.find((t: any) => t.id === tripId)
    },
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
      toast.success("Booking confirmed successfully!")
      navigate("/my-bookings")
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-12 w-1/3 mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-64 md:col-span-1" />
        </div>
      </div>
    )
  }

  if (!trip) {
    return <div className="text-center py-12">Trip not found.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Complete Your Booking</h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          
          {step === "SEAT" ? (
            <Card>
              <CardHeader>
                <CardTitle>Select a Seat</CardTitle>
                <CardDescription>Click on an available seat to select it.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-6 space-x-6 text-sm">
                  <div className="flex items-center"><div className="w-4 h-4 border border-input rounded mr-2"></div> Available</div>
                  <div className="flex items-center"><div className="w-4 h-4 bg-primary rounded mr-2"></div> Selected</div>
                  <div className="flex items-center"><div className="w-4 h-4 bg-muted rounded mr-2"></div> Booked</div>
                </div>
                
                <div className="max-w-sm mx-auto bg-muted/20 border-2 rounded-3xl p-8 pb-12 relative overflow-hidden">
                   {/* Steering wheel visual */}
                   <div className="absolute top-4 right-8 w-8 h-8 border-4 border-muted rounded-full"></div>
                   
                   <div className="mt-12 grid grid-cols-4 gap-4 gap-y-6 justify-items-center">
                     {seats?.map((seat: any) => {
                       const isBooked = seat.status !== "AVAILABLE"
                       const isSelected = selectedSeats.includes(seat.id)
                       
                       // Skip rendering the middle aisle
                       const col = seat.seatNumber % 4
                       const isRightSide = col === 3 || col === 0
                       
                       return (
                         <div key={seat.id} className={`${col === 3 ? "ml-8" : ""}`}>
                           <button
                             disabled={isBooked}
                             onClick={() => setSelectedSeats(prev => 
                               prev.includes(seat.id) ? prev.filter(id => id !== seat.id) : [...prev, seat.id]
                             )}
                             className={`
                               w-10 h-12 rounded-t-lg rounded-b-sm border-2 transition-all flex items-center justify-center font-bold text-xs
                               ${isBooked ? "bg-muted text-muted-foreground border-muted cursor-not-allowed" : 
                                 isSelected ? "bg-primary text-primary-foreground border-primary shadow-md transform scale-110" : 
                                 "bg-background hover:border-primary/50 border-input text-foreground hover:bg-primary/5"}
                             `}
                           >
                             {seat.seatNumber}
                           </button>
                         </div>
                       )
                     })}
                   </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t p-6">
                <Button 
                  size="lg" 
                  disabled={selectedSeats.length === 0}
                  onClick={() => setStep("PAYMENT")}
                >
                  Continue to Payment
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>This is a mock payment for demonstration.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start space-x-3 text-primary">
                  <ShieldCheck className="h-5 w-5 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Secure Checkout</p>
                    <p className="opacity-90">Your payment information is encrypted and secure.</p>
                  </div>
                </div>
                
                <div className="border rounded-lg p-6 flex flex-col items-center justify-center space-y-4">
                   <div className="text-4xl font-bold">₹{selectedSeats.length * 599}</div>
                   <p className="text-muted-foreground">Total amount due</p>
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t p-6">
                <Button variant="ghost" onClick={() => setStep("SEAT")}>Back</Button>
                <Button 
                  size="lg" 
                  onClick={handleBook}
                  disabled={bookMutation.isPending}
                >
                  {bookMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Pay & Confirm
                </Button>
              </CardFooter>
            </Card>
          )}
          
        </div>
        
        {/* Sidebar Summary */}
        <div className="md:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg">Trip Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Route</div>
                <div className="font-semibold">{trip.route?.name}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Departure</div>
                  <div className="font-semibold">{new Date(trip.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  <div className="text-xs text-muted-foreground">{new Date(trip.departureTime).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Arrival</div>
                  <div className="font-semibold">{new Date(trip.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  <div className="text-xs text-muted-foreground">{new Date(trip.arrivalTime).toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Seat(s)</span>
                  <span className="font-semibold text-right">
                    {selectedSeats.length > 0 
                      ? selectedSeats.map(id => seats?.find((s:any) => s.id === id)?.seatNumber).join(', ') 
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Base Fare</span>
                  <span className="font-semibold">₹599 x {selectedSeats.length || 1}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-lg pt-2 border-t mt-2">
                  <span>Total</span>
                  <span className="text-primary">₹{(selectedSeats.length || 1) * 599}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
