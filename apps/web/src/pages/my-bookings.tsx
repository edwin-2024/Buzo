import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Ticket, Map, Calendar, ChevronRight } from "lucide-react"

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

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      // In a real app we'd have an endpoint scoped to the user, e.g. GET /bookings/me
      // Since we don't, we fetch all bookings and filter by passenger ID on client side (for MVP only)
      const { data } = await api.get("/bookings")
      return data.filter((b: any) => b.passengerId === user?.id)
    },
    enabled: !!user
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
          bookings?.map((booking: any) => {
            const isUpcoming = new Date(booking.trip.departureTime) > new Date()
            
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
                        <Badge variant="outline" className={getStatusColor(booking.paymentStatus)}>
                          {booking.paymentStatus}
                        </Badge>
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
                      
                      {isUpcoming && booking.paymentStatus === "PAID" && (
                        <Button 
                          variant="outline" 
                          className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                          onClick={() => navigate(`/track?tripId=${booking.tripId}`)}
                        >
                          <Map className="mr-2 h-4 w-4" /> Live Track Bus
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
