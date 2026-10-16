import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { CreditCard, CheckCircle2, ShieldCheck, Bus, Armchair, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/axios"
import { resolveSeatPricing } from "@/lib/seat-pricing"
import { useAuthStore } from "@/stores/auth.store"

export function PaymentPage() {
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get("tripId")
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardName, setCardName] = useState(user?.name || "")
  const [cardNumber, setCardNumber] = useState("4532 •••• •••• 8920")
  const [expiry, setExpiry] = useState("12/28")
  const [cvv, setCvv] = useState("789")

  const { data: myBookings, isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data } = await api.get("/bookings/me")
      return data
    },
    enabled: !!user
  })

  if (!tripId) {
    return (
      <div className="container py-24 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Invalid Payment Session</h2>
        <p className="text-muted-foreground mb-8">No trip ID was provided for checkout.</p>
        <Button onClick={() => navigate("/")} className="rounded-xl">Return Home</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container max-w-lg mx-auto py-12 px-4">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  // Filter pending bookings for this trip
  const pendingTripBookings = myBookings?.filter(
    (b: any) => b.tripId === tripId && b.paymentStatus === "PENDING"
  ) || []

  // Check if they already paid
  const paidTripBookings = myBookings?.filter(
    (b: any) => b.tripId === tripId && b.paymentStatus === "PAID"
  ) || []

  if (pendingTripBookings.length === 0 && paidTripBookings.length > 0) {
    return (
      <div className="container max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold">Booking Already Confirmed</h2>
        <p className="text-muted-foreground text-sm">
          Payment for this trip has already been completed. You can view your digital ticket and download invoices from My Bookings.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => navigate("/my-bookings")} className="rounded-xl font-semibold">
            View My Bookings
          </Button>
          <Button variant="outline" onClick={() => navigate(`/track?tripId=${tripId}`)} className="rounded-xl font-semibold">
            Live Radar
          </Button>
        </div>
      </div>
    )
  }

  // Calculate real pricing breakdown
  const bookingBreakdown = pendingTripBookings.map((b: any) => {
    const pricing = resolveSeatPricing(b.seat, b.seat?.seatNumber || 1)
    return {
      bookingId: b.id,
      seatNumber: b.seat?.seatNumber,
      tierName: pricing.name,
      price: pricing.price
    }
  })

  // Fallback to single seat estimate if accessed without pending bookings
  const totalAmount = bookingBreakdown.length > 0
    ? bookingBreakdown.reduce((sum: number, item: any) => sum + item.price, 0)
    : 599

  const routeName = pendingTripBookings[0]?.trip?.route?.name || "Express Bus Journey"
  const busNumber = pendingTripBookings[0]?.trip?.bus?.number || "Luxury Coach"

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Simulate network delay for realistic feel
      await new Promise(resolve => setTimeout(resolve, 1200))

      const { data } = await api.post("/payments/create-checkout-session", { tripId })
      
      if (data.success) {
        toast.success("Payment successful! Your seats are confirmed.")
        navigate(data.url || "/my-bookings")
      }
    } catch (error) {
      console.error("Payment failed", error)
      toast.error("Payment failed. Please try again.")
      setIsProcessing(false)
    }
  }

  return (
    <div className="container max-w-lg mx-auto py-12 px-4">
      <Card className="border-2 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center space-y-2 border-b bg-muted/20 pb-6">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-1 text-primary">
            <CreditCard className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">Complete Payment</CardTitle>
          <CardDescription className="text-xs">
            Review your reservation details and complete checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          {/* Interactive Digital Card Visual */}
          <div className="relative w-full h-48 rounded-2xl p-5 text-white shadow-2xl overflow-hidden bg-gradient-to-tr from-slate-900 via-blue-950 to-indigo-900 border border-white/15 flex flex-col justify-between">
            {/* Background geometric accents */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Bus className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <span className="font-extrabold text-xs tracking-wider uppercase block">BUZO LUXE</span>
                  <span className="text-[9px] text-blue-200/70 font-mono tracking-widest">TRANSIT PASS</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 opacity-80">
                <span className="text-[10px] font-mono tracking-widest uppercase">NFC</span>
                <div className="w-3.5 h-3.5 rounded-full border border-white/40 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
              </div>
            </div>

            {/* Chip & contactless */}
            <div className="flex items-center gap-3 z-10 my-1">
              <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/60 shadow-xs flex items-center justify-center">
                <div className="w-6 h-4 border border-amber-800/40 rounded-xs"></div>
              </div>
            </div>

            {/* Card Number */}
            <div className="z-10 font-mono text-lg tracking-widest text-slate-100 font-bold truncate">
              {cardNumber || "•••• •••• •••• ••••"}
            </div>

            {/* Name and Expiry */}
            <div className="flex justify-between items-end z-10 text-xs">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Cardholder</span>
                <span className="font-bold tracking-wide uppercase text-sm truncate max-w-[200px] block">
                  {cardName || "YOUR NAME"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Expires</span>
                <span className="font-mono font-bold text-sm tracking-widest">{expiry || "MM/YY"}</span>
              </div>
            </div>
          </div>

          {/* Quick Demo Fill Helper */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setCardName(user?.name || "Alex Mercer")
                setCardNumber("4532 8901 2345 8920")
                setExpiry("08/29")
                setCvv("420")
                toast.success("Demo payment credentials filled")
              }}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              ⚡ Fill Demo Card Details
            </button>
          </div>

          {/* Trip & Seat Summary */}
          <div className="bg-secondary/40 rounded-2xl p-4 border border-border/70 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Journey Route</span>
                <p className="font-black text-sm text-foreground flex items-center gap-1.5 mt-0.5">
                  <Bus className="w-3.5 h-3.5 text-primary" /> {routeName}
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono bg-primary/5 text-primary border-primary/20">
                {busNumber}
              </Badge>
            </div>

            {/* Selected Seats Breakdown */}
            {bookingBreakdown.length > 0 && (
              <div className="pt-2 border-t border-border/50 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Reserved Seats ({bookingBreakdown.length})
                </span>
                <div className="space-y-1">
                  {bookingBreakdown.map((item: any) => (
                    <div key={item.bookingId} className="flex justify-between items-center text-xs">
                      <span className="font-medium flex items-center gap-1.5">
                        <Armchair className="w-3 h-3 text-primary" />
                        Seat {item.seatNumber}
                        <span className="text-[10px] text-muted-foreground">({item.tierName})</span>
                      </span>
                      <span className="font-bold">₹{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-border/50 flex justify-between items-baseline">
              <div>
                <p className="text-xs text-muted-foreground">Total Payable Amount</p>
                <p className="text-3xl font-black text-primary">₹{totalAmount}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Encrypted
              </div>
            </div>
          </div>

          <form id="payment-form" onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cardholder Name
              </Label>
              <Input 
                id="name" 
                value={cardName} 
                onChange={(e) => setCardName(e.target.value)} 
                placeholder="John Doe" 
                className="h-11 rounded-xl bg-background/80"
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="card" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Card Number
              </Label>
              <Input 
                id="card" 
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4532 •••• •••• 8920" 
                maxLength={19} 
                className="h-11 rounded-xl font-mono bg-background/80"
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="expiry" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Expiry Date
                </Label>
                <Input 
                  id="expiry" 
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY" 
                  maxLength={5} 
                  className="h-11 rounded-xl font-mono bg-background/80"
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cvv" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  CVV / CVC
                </Label>
                <Input 
                  id="cvv" 
                  type="password" 
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="•••" 
                  maxLength={4} 
                  className="h-11 rounded-xl font-mono bg-background/80"
                  required 
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 border-t border-border/60 bg-muted/10 p-6">
          <Button 
            form="payment-form" 
            type="submit" 
            className="w-full h-12 text-sm font-bold rounded-xl shadow-lg shadow-primary/25 gap-2" 
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Authorizing Payment...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Pay ₹{totalAmount} & Confirm Reservation
              </>
            )}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Test payment gateway active. Click confirm to instantly issue your ticket and receipt.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
