import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { 
  Ticket, 
  Map, 
  Calendar, 
  Trash2, 
  FileText, 
  Mail, 
  Loader2, 
  Printer, 
  X, 
  ArrowRight, 
  Bus, 
  ShieldCheck 
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/axios"
import { resolveSeatPricing } from "@/lib/seat-pricing"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export function MyBookingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<any | null>(null)
  const [boardingPassTarget, setBoardingPassTarget] = useState<any | null>(null)

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data } = await api.get("/bookings/me")
      return data
    },
    enabled: !!user
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bookings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] })
      toast.success("Booking cancelled successfully")
    },
    onError: () => toast.error("Failed to cancel booking")
  })

  const emailReceiptMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.post(`/bookings/${bookingId}/receipt/email`)
      return data
    },
    onSuccess: () => {
      toast.success("Receipt sent to your email!")
    },
    onError: () => {
      toast.error("Failed to email receipt")
    }
  })

  const handleDownloadReceipt = async (bookingId: string) => {
    try {
      setDownloadingId(bookingId)
      const response = await api.get(`/bookings/${bookingId}/receipt`, {
        responseType: "blob"
      })
      const blob = new Blob([response.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `buzo-receipt-${bookingId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success("Receipt downloaded successfully")
    } catch (error) {
      console.error("Failed to download receipt:", error)
      toast.error("Failed to download receipt")
    } finally {
      setDownloadingId(null)
    }
  }

  if (!user) {
    return <div className="text-center py-12">Please log in to view your bookings.</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500/10 text-yellow-500 border-yellow-200"
      case "PAID": return "bg-green-500/10 text-green-500 border-green-200"
      case "FAILED": return "bg-destructive/10 text-destructive border-destructive/20"
      case "REFUNDED": return "bg-muted text-muted-foreground"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const upcomingBookings = bookings?.filter((b: any) => 
    b.trip.status !== "COMPLETED" && b.trip.status !== "CANCELLED"
  ) || []

  const pastBookings = bookings?.filter((b: any) => 
    b.trip.status === "COMPLETED" || b.trip.status === "CANCELLED"
  ) || []

  const renderBookingCard = (booking: any) => {
    const isEligibleForReceipt =
      booking.paymentStatus === "PAID" || booking.trip?.status === "COMPLETED"
    const seatPricing = resolveSeatPricing(booking.seat, booking.seat?.seatNumber || 1)

    return (
      <Card key={booking.id} className="overflow-hidden transition-all hover:shadow-md border-border/50">
        <div className="md:flex">
          {/* Left Side: Ticket Visual */}
          <div className="bg-primary/5 p-6 border-b md:border-b-0 md:border-r border-dashed border-primary/20 md:w-48 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Seat</div>
              <div className="text-5xl font-black text-primary">{booking.seat?.seatNumber}</div>
              <div className="text-[10px] font-semibold text-muted-foreground mt-1.5 px-2 py-0.5 rounded-full bg-background border truncate max-w-[150px]">
                {seatPricing.name}
              </div>
              <div className="text-sm font-extrabold text-foreground mt-1">₹{seatPricing.price}</div>
            </div>
          </div>
          
          {/* Right Side: Details */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold">{booking.trip.route?.name}</h3>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={getStatusColor(booking.paymentStatus)}>
                    {booking.paymentStatus}
                  </Badge>
                  {booking.trip.status === "COMPLETED" && (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px]">
                      COMPLETED
                    </Badge>
                  )}
                  {booking.trip.status === "CANCELLED" && (
                    <Badge variant="destructive" className="text-[10px]">
                      CANCELLED
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div className="flex items-start space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Departure</p>
                    <p className="text-muted-foreground">{new Date(booking.trip.departureTime).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Map className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Bus Details</p>
                    <p className="text-muted-foreground">{booking.trip.bus?.number}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
              <div className="font-mono text-xs text-muted-foreground">
                ID: {booking.id}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {booking.paymentStatus === "PENDING" && (
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => navigate(`/payment?tripId=${booking.tripId}`)}
                  >
                    Pay Now
                  </Button>
                )}

                {isEligibleForReceipt && (
                  <>
                    <Button
                      variant="outline"
                      className="border-primary/20 text-primary hover:bg-primary/5"
                      onClick={() => handleDownloadReceipt(booking.id)}
                      disabled={downloadingId === booking.id}
                    >
                      {downloadingId === booking.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="mr-2 h-4 w-4" />
                      )}
                      Download Invoice
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border text-foreground hover:bg-muted"
                      onClick={() => emailReceiptMutation.mutate(booking.id)}
                      disabled={
                        emailReceiptMutation.isPending &&
                        emailReceiptMutation.variables === booking.id
                      }
                    >
                      {emailReceiptMutation.isPending &&
                      emailReceiptMutation.variables === booking.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Email Receipt
                    </Button>
                  </>
                )}
                
                {booking.paymentStatus === "PAID" && (
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                    onClick={() => setBoardingPassTarget(booking)}
                  >
                    <Ticket className="mr-2 h-4 w-4" /> Boarding Pass
                  </Button>
                )}

                {booking.paymentStatus === "PAID" && booking.trip.status !== "COMPLETED" && booking.trip.status !== "CANCELLED" && (
                  <Button 
                    variant="outline" 
                    className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => navigate(`/track?tripId=${booking.tripId}`)}
                  >
                    <Map className="mr-2 h-4 w-4" /> Live Track Bus
                  </Button>
                )}
                {booking.trip.status !== "COMPLETED" && booking.trip.status !== "CANCELLED" && (
                  <Button 
                    variant="ghost" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setCancelTarget(booking)}
                    disabled={cancelMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Cancel Ticket
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your upcoming trips and view past travels.
        </p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))
        ) : bookings?.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/5">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Ticket className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-6">
                You haven't booked any trips. Ready to explore?
              </p>
              <Button onClick={() => navigate("/")}>
                Book a Ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcomingBookings.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Trips
                </h2>
                <div className="space-y-4">
                  {upcomingBookings.map(renderBookingCard)}
                </div>
              </div>
            )}
            
            {pastBookings.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                  <Map className="h-5 w-5" />
                  Past History
                </h2>
                <div className="space-y-4">
                  {pastBookings.map(renderBookingCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <Card className="max-w-md w-full border-2 border-destructive/20 shadow-2xl rounded-3xl overflow-hidden bg-card">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground">Cancel Ticket Reservation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to cancel your seat reservation for{" "}
                  <strong className="text-foreground">Seat {cancelTarget.seat?.seatNumber}</strong> on{" "}
                  <strong className="text-foreground">{cancelTarget.trip?.route?.name}</strong>?
                </p>
                <div className="mt-3 p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground border">
                  This seat will be immediately released back to the inventory and made available for other travelers.
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCancelTarget(null)}
                  className="rounded-xl"
                  disabled={cancelMutation.isPending}
                >
                  Keep Ticket
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    cancelMutation.mutate(cancelTarget.id, {
                      onSettled: () => setCancelTarget(null)
                    })
                  }}
                  disabled={cancelMutation.isPending}
                  className="rounded-xl font-bold"
                >
                  {cancelMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Digital Boarding Pass Modal */}
      {boardingPassTarget && (() => {
        const targetPricing = resolveSeatPricing(boardingPassTarget.seat, boardingPassTarget.seat?.seatNumber || 1)
        const stops = boardingPassTarget.trip?.route?.stops || []
        const origin = stops[0]?.stop?.name || "Departure Station"
        const destination = stops[stops.length - 1]?.stop?.name || "Arrival Terminal"
        const depTime = new Date(boardingPassTarget.trip?.departureTime)
        const arrTime = new Date(boardingPassTarget.trip?.arrivalTime)
        const isUpperDeck = (boardingPassTarget.seat?.seatNumber || 1) > 20
        const passRef = `BZ-${boardingPassTarget.id.substring(0, 8).toUpperCase()}`

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-boarding-pass, #printable-boarding-pass * {
                  visibility: visible !important;
                }
                #printable-boarding-pass {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 650px !important;
                  margin: 0 auto !important;
                  box-shadow: none !important;
                  border: 2px solid #000 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            <div className="max-w-md w-full space-y-4 my-8">
              {/* Ticket Card */}
              <div 
                id="printable-boarding-pass"
                className="bg-card border-2 border-primary/20 rounded-3xl shadow-2xl overflow-hidden relative text-card-foreground"
              >
                {/* Header Banner */}
                <div className="bg-primary text-primary-foreground p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                      <Bus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base tracking-wide leading-tight">BUZO EXPRESS</h3>
                      <p className="text-[10px] text-primary-foreground/80 font-medium tracking-wider uppercase">
                        Executive AC Luxury Coach
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary-foreground/75 block">Class</span>
                      <span className="text-xs font-black tracking-wide bg-white/20 px-2 py-0.5 rounded-full">PREMIUM</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBoardingPassTarget(null)}
                      className="no-print p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Journey Waypoints */}
                <div className="p-6 bg-gradient-to-b from-primary/5 to-transparent border-b border-dashed border-border/70">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Origin</span>
                      <h4 className="text-xl font-black text-foreground tracking-tight mt-0.5 truncate">{origin}</h4>
                      <p className="text-xs font-bold text-primary mt-1">
                        {depTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono font-medium text-muted-foreground whitespace-nowrap">Direct Route</span>
                    </div>

                    <div className="flex-1 text-right">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Destination</span>
                      <h4 className="text-xl font-black text-foreground tracking-tight mt-0.5 truncate">{destination}</h4>
                      <p className="text-xs font-bold text-muted-foreground mt-1">
                        {arrTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Perforated Notches */}
                <div className="relative flex items-center justify-between px-4 -my-3 z-10">
                  <div className="w-6 h-6 rounded-full bg-black/75 -ml-7 border-r-2 border-primary/20"></div>
                  <div className="w-full border-t-2 border-dashed border-border/80"></div>
                  <div className="w-6 h-6 rounded-full bg-black/75 -mr-7 border-l-2 border-primary/20"></div>
                </div>

                {/* Ticket Details Grid */}
                <div className="p-6 grid grid-cols-3 gap-y-4 gap-x-2 text-xs border-b border-border/50">
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Passenger</span>
                    <span className="font-bold text-foreground text-sm truncate block mt-0.5">{user?.name}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Seat & Tier</span>
                    <span className="font-extrabold text-primary text-sm flex items-center gap-1 mt-0.5">
                      Seat {boardingPassTarget.seat?.seatNumber}
                      <span className="text-[9px] font-medium text-muted-foreground">({targetPricing.name.split(" ")[0]})</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Deck Layout</span>
                    <span className="font-bold text-foreground text-sm block mt-0.5">
                      {isUpperDeck ? "Upper Deck" : "Lower Deck"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Coach Bus</span>
                    <span className="font-mono font-bold text-foreground text-sm block mt-0.5">
                      {boardingPassTarget.trip?.bus?.number || "BUZO-01"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Departure Date</span>
                    <span className="font-bold text-foreground text-xs block mt-0.5">
                      {depTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Platform Bay</span>
                    <span className="font-bold text-foreground text-sm block mt-0.5">
                      Bay 04
                    </span>
                  </div>
                </div>

                {/* QR Code & Barcode Verification Area */}
                <div className="p-6 bg-muted/20 flex flex-col items-center text-center space-y-4">
                  {/* Dynamic SVG QR Code */}
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-border/80">
                    <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
                      {/* Top-Left Finder */}
                      <rect x="10" y="10" width="35" height="35" rx="4" fill="#000000" />
                      <rect x="15" y="15" width="25" height="25" rx="2" fill="#ffffff" />
                      <rect x="20" y="20" width="15" height="15" rx="1" fill="#000000" />
                      
                      {/* Top-Right Finder */}
                      <rect x="85" y="10" width="35" height="35" rx="4" fill="#000000" />
                      <rect x="90" y="15" width="25" height="25" rx="2" fill="#ffffff" />
                      <rect x="95" y="20" width="15" height="15" rx="1" fill="#000000" />
                      
                      {/* Bottom-Left Finder */}
                      <rect x="10" y="85" width="35" height="35" rx="4" fill="#000000" />
                      <rect x="15" y="90" width="25" height="25" rx="2" fill="#ffffff" />
                      <rect x="20" y="95" width="15" height="15" rx="1" fill="#000000" />

                      {/* Data dots matrix */}
                      <rect x="52" y="12" width="6" height="6" fill="#000000" />
                      <rect x="64" y="12" width="6" height="6" fill="#000000" />
                      <rect x="72" y="20" width="6" height="6" fill="#000000" />
                      <rect x="52" y="28" width="6" height="6" fill="#000000" />
                      <rect x="68" y="32" width="6" height="6" fill="#000000" />
                      <rect x="12" y="52" width="6" height="6" fill="#000000" />
                      <rect x="28" y="52" width="6" height="6" fill="#000000" />
                      <rect x="20" y="68" width="6" height="6" fill="#000000" />
                      <rect x="36" y="60" width="6" height="6" fill="#000000" />
                      <rect x="50" y="50" width="10" height="10" fill="#2563eb" rx="2" />
                      <rect x="68" y="52" width="6" height="6" fill="#000000" />
                      <rect x="80" y="60" width="6" height="6" fill="#000000" />
                      <rect x="96" y="52" width="6" height="6" fill="#000000" />
                      <rect x="112" y="68" width="6" height="6" fill="#000000" />
                      <rect x="52" y="68" width="6" height="6" fill="#000000" />
                      <rect x="64" y="74" width="6" height="6" fill="#000000" />
                      <rect x="52" y="88" width="6" height="6" fill="#000000" />
                      <rect x="68" y="94" width="6" height="6" fill="#000000" />
                      <rect x="84" y="86" width="6" height="6" fill="#000000" />
                      <rect x="100" y="92" width="6" height="6" fill="#000000" />
                      <rect x="112" y="88" width="6" height="6" fill="#000000" />
                      <rect x="92" y="106" width="6" height="6" fill="#000000" />
                      <rect x="108" y="108" width="6" height="6" fill="#000000" />
                      <rect x="60" y="112" width="6" height="6" fill="#000000" />
                      <rect x="74" y="112" width="6" height="6" fill="#000000" />
                    </svg>
                  </div>

                  {/* Optical Barcode Graphic */}
                  <div className="w-full max-w-[280px] space-y-1">
                    <div className="h-9 flex items-center justify-center gap-[2.5px] overflow-hidden opacity-85">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`bg-foreground h-full ${
                            i % 7 === 0 ? 'w-1.5' : i % 3 === 0 ? 'w-1' : 'w-0.5'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="font-mono text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                      {passRef} • VERIFIED PAID
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-green-600" />
                      Present this digital boarding pass at the bus entrance
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Below Ticket (Hidden on Print) */}
              <div className="no-print flex items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex-1 bg-card hover:bg-secondary font-bold text-xs rounded-xl h-11"
                >
                  <Printer className="w-4 h-4 mr-2 text-primary" />
                  Print / Save Pass
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate(`/track?tripId=${boardingPassTarget.tripId}`)}
                  className="flex-1 bg-card hover:bg-secondary font-bold text-xs rounded-xl h-11"
                >
                  <Map className="w-4 h-4 mr-2 text-primary" />
                  Track Coach
                </Button>

                <Button
                  onClick={() => setBoardingPassTarget(null)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-11 px-5"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
