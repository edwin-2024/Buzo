import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { 
  Bus, 
  MapPin, 
  Route as RouteIcon, 
  Users, 
  CreditCard,
  TrendingUp,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react"

import { stopsApi } from "@/api/stops"
import { routesApi } from "@/api/routes"
import { busesApi } from "@/api/buses"
import { driversApi } from "@/api/drivers"
import { tripsApi } from "@/api/trips"
import { bookingsApi } from "@/api/bookings"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  subtitle,
  isLoading 
}: { 
  title: string
  value?: number | string
  icon: any
  subtitle?: string
  isLoading: boolean
}) {
  return (
    <Card className="border-border/60 hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-[60px]" />
        ) : (
          <div>
            <div className="text-2xl font-bold tracking-tight">{value ?? 0}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()

  const { data: stops } = useQuery({
    queryKey: ["stops"],
    queryFn: stopsApi.getAll,
  })

  const { data: routes } = useQuery({
    queryKey: ["routes"],
    queryFn: routesApi.getAll,
  })

  const { data: buses, isLoading: busesLoading } = useQuery({
    queryKey: ["buses"],
    queryFn: busesApi.getAll,
  })

  const { data: drivers } = useQuery({
    queryKey: ["drivers"],
    queryFn: driversApi.getAll,
  })

  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: tripsApi.getAll,
  })

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: bookingsApi.getAll,
  })

  // Computed metrics
  const paidBookings = bookings?.filter((b: any) => b.paymentStatus === "PAID") || []
  const pendingBookings = bookings?.filter((b: any) => b.paymentStatus === "PENDING") || []
  
  // Approximate revenue based on standard booking fare ₹649 average
  const estimatedRevenue = paidBookings.length * 649

  const activeTrips = trips?.filter((t: any) => t.status === "IN_PROGRESS") || []
  const scheduledTrips = trips?.filter((t: any) => t.status === "SCHEDULED" || t.status === "BOARDING") || []
  const completedTrips = trips?.filter((t: any) => t.status === "COMPLETED") || []

  // Recent 6 bookings
  const recentBookings = bookings ? [...bookings].reverse().slice(0, 6) : []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">PAID</Badge>
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[10px]">PENDING</Badge>
      case "FAILED":
      case "CANCELLED":
        return <Badge variant="destructive" className="text-[10px]">CANCELLED</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Operations Command Center
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Fleet & Reservation Overview</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor real-time transit schedules, booking revenue, and fleet dispatch statuses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate("/live-map")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
          >
            <Activity className="w-4 h-4 mr-2" /> Live Fleet Radar
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate("/trips")}
            className="border-border hover:bg-secondary font-medium"
          >
            Schedule Trip
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Gross Bookings Revenue" 
          value={`₹${estimatedRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
          subtitle={`${paidBookings.length} confirmed tickets`}
          isLoading={bookingsLoading} 
        />
        <StatCard 
          title="Active In-Transit Trips" 
          value={activeTrips.length} 
          icon={Activity} 
          subtitle={`${scheduledTrips.length} scheduled next`}
          isLoading={tripsLoading} 
        />
        <StatCard 
          title="Total Buses in Fleet" 
          value={buses?.length} 
          icon={Bus} 
          subtitle={`${drivers?.length || 0} registered drivers`}
          isLoading={busesLoading} 
        />
        <StatCard 
          title="Total Bookings Made" 
          value={bookings?.length} 
          icon={CreditCard} 
          subtitle={`${pendingBookings.length} awaiting checkout`}
          isLoading={bookingsLoading} 
        />
      </div>

      {/* Operations Matrix & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Trip Dispatch & Fleet Health */}
        <Card className="col-span-4 border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Trip Dispatch & Schedule Breakdown
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Current lifecycle of scheduled and active coach trips.
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-primary hover:bg-primary/5"
                onClick={() => navigate("/trips")}
              >
                View All Trips <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="text-2xl font-black text-green-600">{activeTrips.length}</div>
                <div className="text-xs font-semibold text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Activity className="w-3 h-3 text-green-600" /> In Progress
                </div>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="text-2xl font-black text-blue-600">{scheduledTrips.length}</div>
                <div className="text-xs font-semibold text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600" /> Scheduled
                </div>
              </div>
              <div className="p-4 rounded-xl bg-secondary/80 border border-border/60">
                <div className="text-2xl font-black text-foreground">{completedTrips.length}</div>
                <div className="text-xs font-semibold text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-muted-foreground" /> Completed
                </div>
              </div>
            </div>

            {/* Network Infrastructure Summary */}
            <div className="pt-4 border-t border-border/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Network Infrastructure
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <RouteIcon className="w-4 h-4 text-primary" /> Active Routes:
                  </span>
                  <span className="font-bold text-foreground">{routes?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary" /> Terminals & Stops:
                  </span>
                  <span className="font-bold text-foreground">{stops?.length || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Bookings Feed */}
        <Card className="col-span-3 border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Recent Reservations
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Latest passenger booking requests.
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-primary hover:bg-primary/5"
                onClick={() => navigate("/bookings")}
              >
                All Bookings <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No recent bookings recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((b: any) => (
                  <div 
                    key={b.id} 
                    className="p-3 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {b.passenger?.name || "Passenger"}
                        <span className="text-[10px] text-muted-foreground font-mono">
                          (Seat {b.seat?.seatNumber})
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                        {b.trip?.route?.name || "Express Line"}
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(b.paymentStatus)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

