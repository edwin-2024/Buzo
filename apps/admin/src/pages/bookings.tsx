import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Search, CreditCard, Ban, CheckCircle2, Clock, AlertCircle } from "lucide-react"

import { bookingsApi } from "@/api/bookings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export function BookingsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: bookingsApi.getAll,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      toast.success("Booking cancelled and seat released")
    },
    onError: () => toast.error("Failed to cancel booking")
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": 
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" /> PENDING
          </Badge>
        )
      case "PAID": 
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> PAID
          </Badge>
        )
      case "FAILED": 
      case "CANCELLED":
        return (
          <Badge variant="destructive" className="text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {status}
          </Badge>
        )
      default: 
        return <Badge variant="outline" className="text-xs">{status}</Badge>
    }
  }

  const filteredBookings = useMemo(() => {
    if (!bookings) return []
    return bookings.filter((b: any) => {
      const matchesStatus = statusFilter === "ALL" || b.paymentStatus === statusFilter
      const query = search.toLowerCase().trim()
      if (!query) return matchesStatus

      const idMatch = b.id.toLowerCase().includes(query)
      const nameMatch = b.passenger?.name?.toLowerCase().includes(query)
      const emailMatch = b.passenger?.email?.toLowerCase().includes(query)
      const routeMatch = b.trip?.route?.name?.toLowerCase().includes(query)
      const seatMatch = b.seat?.seatNumber?.toString().includes(query)

      return matchesStatus && (idMatch || nameMatch || emailMatch || routeMatch || seatMatch)
    })
  }, [bookings, search, statusFilter])

  const totalPaid = bookings?.filter((b: any) => b.paymentStatus === "PAID").length || 0
  const totalRevenue = totalPaid * 649

  return (
    <div className="space-y-6">
      {/* Header with Title & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Passenger Reservations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit confirmed passenger tickets, seat allotments, and transaction settlements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 text-xs font-semibold">
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            ₹{totalRevenue.toLocaleString()} Total Revenue ({totalPaid} tickets)
          </Badge>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/60">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search passenger, seat, route or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/80"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {["ALL", "PAID", "PENDING", "CANCELLED"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-xl card-linear overflow-hidden shadow-xs tabular-nums">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60 bg-secondary/30">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Booking ID</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Passenger</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Route & Date</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seat</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Settlement</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <CreditCard className="h-8 w-8 text-muted-foreground/50 mb-1" />
                      <p className="text-sm font-medium text-foreground">No reservations match your filter</p>
                      <p className="text-xs text-muted-foreground">Try clearing your search query or switching status filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking: any) => {
                  const seatNum = parseInt(booking.seat?.seatNumber || "0")
                  const isFrontRow = seatNum > 0 && seatNum <= 4

                  return (
                    <TableRow key={booking.id} className="hover:bg-secondary/40 border-b border-border/40 transition-colors">
                      <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                        #{booking.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground text-sm">
                          {booking.passenger?.name || "Passenger"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {booking.passenger?.email || "No email"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">
                          {booking.trip?.route?.name || "Transit Route"}
                        </div>
                        <div className="text-muted-foreground text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {booking.trip?.departureTime 
                            ? new Date(booking.trip.departureTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
                            : "Scheduled"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-foreground">
                            Seat {booking.seat?.seatNumber}
                          </span>
                          {isFrontRow && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              PREMIUM
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(booking.paymentStatus)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          disabled={cancelMutation.isPending}
                          onClick={() => {
                            if (confirm(`Cancel reservation #${booking.id.slice(0, 8)} and refund seat ${booking.seat?.seatNumber}?`)) {
                              cancelMutation.mutate(booking.id)
                            }
                          }}
                        >
                          <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
