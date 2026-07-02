import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { bookingsApi } from "@/api/bookings"
import { Button } from "@/components/ui/button"
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

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: bookingsApi.getAll,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      toast.success("Booking cancelled")
    },
    onError: () => toast.error("Failed to cancel booking")
  })

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Operations: Bookings</h2>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking ID</TableHead>
              <TableHead>Passenger</TableHead>
              <TableHead>Trip</TableHead>
              <TableHead>Seat</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
            ) : bookings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              bookings?.map((booking: any) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {booking.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-medium">
                    {booking.passenger?.name || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {booking.trip?.route?.name || "Unknown Route"}
                      <div className="text-muted-foreground text-xs">
                        {new Date(booking.trip?.departureTime).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    Seat {booking.seat?.seatNumber}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(booking.paymentStatus)}>
                      {booking.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Cancel this booking and free up the seat?`)) {
                          cancelMutation.mutate(booking.id)
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
