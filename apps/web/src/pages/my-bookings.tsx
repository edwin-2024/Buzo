import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Ticket, Map, Calendar, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/axios"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export function MyBookingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

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
    return (
      <Card key={booking.id} className="overflow-hidden transition-all hover:shadow-md border-border/50">
        <div className="md:flex">
          {/* Left Side: Ticket Visual */}
          <div className="bg-primary/5 p-6 border-b md:border-b-0 md:border-r border-dashed border-primary/20 md:w-48 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Seat</div>
              <div className="text-5xl font-black text-primary">{booking.seat?.seatNumber}</div>
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
            
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="font-mono text-xs text-muted-foreground">
                ID: {booking.id}
              </div>
              
              <div className="flex gap-2">
                {booking.paymentStatus === "PENDING" && (
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => navigate(`/payment?tripId=${booking.tripId}`)}
                  >
                    Pay Now
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
                    onClick={() => {
                      if (confirm("Are you sure you want to cancel this ticket? This action cannot be undone.")) {
                        cancelMutation.mutate(booking.id)
                      }
                    }}
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
    </div>
  )
}
