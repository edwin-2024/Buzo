import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, CalendarDays } from "lucide-react"
import { toast } from "sonner"

import { tripsApi } from "@/api/trips"
import { routesApi } from "@/api/routes"
import { busesApi } from "@/api/buses"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export function TripsPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formData, setFormData] = useState({ 
    routeId: "", 
    busId: "", 
    departureTime: "", 
    arrivalTime: "" 
  })

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: tripsApi.getAll,
  })

  const { data: routes } = useQuery({
    queryKey: ["routes"],
    queryFn: routesApi.getAll,
  })

  const { data: buses } = useQuery({
    queryKey: ["buses"],
    queryFn: busesApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (newTrip: any) => tripsApi.create(newTrip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] })
      setIsAddOpen(false)
      setFormData({ routeId: "", busId: "", departureTime: "", arrivalTime: "" })
      toast.success("Trip scheduled successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to schedule trip")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tripsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] })
      toast.success("Trip deleted")
    },
    onError: () => toast.error("Failed to delete trip")
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      departureTime: new Date(formData.departureTime).toISOString(),
      arrivalTime: new Date(formData.arrivalTime).toISOString(),
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED": return "bg-blue-500/10 text-blue-500 border-blue-200"
      case "BOARDING": return "bg-yellow-500/10 text-yellow-500 border-yellow-200"
      case "IN_PROGRESS": return "bg-primary/10 text-primary border-primary/20"
      case "COMPLETED": return "bg-green-500/10 text-green-500 border-green-200"
      case "CANCELLED": return "bg-destructive/10 text-destructive border-destructive/20"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Operations: Trips</h2>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Schedule Trip
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Trip</DialogTitle>
              <DialogDescription>
                Assign a bus to a route and set departure/arrival times.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="routeId">Route</Label>
                  <select 
                    id="routeId"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.routeId}
                    onChange={(e) => setFormData({...formData, routeId: e.target.value})}
                    required
                  >
                    <option value="" disabled>Select a route</option>
                    {routes?.map((route: any) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="busId">Bus</Label>
                  <select 
                    id="busId"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.busId}
                    onChange={(e) => setFormData({...formData, busId: e.target.value})}
                    required
                  >
                    <option value="" disabled>Select a bus</option>
                    {buses?.map((bus: any) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.number} ({bus.capacity} seats)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="departure">Departure</Label>
                    <Input 
                      id="departure" 
                      type="datetime-local"
                      value={formData.departureTime}
                      onChange={(e) => setFormData({...formData, departureTime: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="arrival">Arrival</Label>
                    <Input 
                      id="arrival" 
                      type="datetime-local"
                      value={formData.arrivalTime}
                      onChange={(e) => setFormData({...formData, arrivalTime: e.target.value})}
                      required 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Scheduling..." : "Schedule Trip"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Bus</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : trips?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No trips scheduled.
                </TableCell>
              </TableRow>
            ) : (
              trips?.map((trip: any) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                      {trip.route?.name || "Unknown Route"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {trip.bus?.number || "Unknown Bus"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div><span className="text-muted-foreground">Dep:</span> {new Date(trip.departureTime).toLocaleString()}</div>
                      <div><span className="text-muted-foreground">Arr:</span> {new Date(trip.arrivalTime).toLocaleString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(trip.status)}>
                      {trip.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete this trip?`)) {
                          deleteMutation.mutate(trip.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
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
