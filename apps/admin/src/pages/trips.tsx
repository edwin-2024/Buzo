import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, CalendarDays, Pencil, Search, Activity, Clock, CheckCircle2 } from "lucide-react"
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
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
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

  const updateMutation = useMutation({
    mutationFn: (data: {id: string, trip: any}) => tripsApi.update(data.id, data.trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] })
      setIsEditOpen(false)
      setEditingId(null)
      setFormData({ routeId: "", busId: "", departureTime: "", arrivalTime: "" })
      toast.success("Trip updated successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update trip")
    }
  })

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    updateMutation.mutate({
      id: editingId,
      trip: {
        ...formData,
        departureTime: new Date(formData.departureTime).toISOString(),
        arrivalTime: new Date(formData.arrivalTime).toISOString(),
      }
    })
  }

  const openEdit = (trip: any) => {
    // Format ISO string to YYYY-MM-DDThh:mm for the input
    const formatForInput = (isoString: string) => {
      const date = new Date(isoString);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    
    setEditingId(trip.id)
    setFormData({
      routeId: trip.routeId,
      busId: trip.busId,
      departureTime: formatForInput(trip.departureTime),
      arrivalTime: formatForInput(trip.arrivalTime)
    })
    setIsEditOpen(true)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...formData,
      departureTime: new Date(formData.departureTime).toISOString(),
      arrivalTime: new Date(formData.arrivalTime).toISOString(),
    })
  }

  const filteredTrips = useMemo(() => {
    if (!trips) return []
    return trips.filter((t: any) => {
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter
      const query = search.toLowerCase().trim()
      if (!query) return matchesStatus

      const routeMatch = t.route?.name?.toLowerCase().includes(query)
      const busMatch = t.bus?.number?.toLowerCase().includes(query)
      const idMatch = t.id?.toLowerCase().includes(query)

      return matchesStatus && (routeMatch || busMatch || idMatch)
    })
  }, [trips, search, statusFilter])

  const activeCount = trips?.filter((t: any) => t.status === "IN_PROGRESS").length || 0
  const scheduledCount = trips?.filter((t: any) => t.status === "SCHEDULED" || t.status === "BOARDING").length || 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED": return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "BOARDING": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "IN_PROGRESS": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "COMPLETED": return "bg-muted text-muted-foreground border-border"
      case "CANCELLED": return "bg-destructive/10 text-destructive border-destructive/20"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Trips & Dispatch Schedule</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage coach timetables, route assignments, and departure statuses.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            {activeCount} In Progress
          </Badge>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            {scheduledCount} Scheduled
          </Badge>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="font-semibold shadow-xs">
                <Plus className="mr-2 h-4 w-4" /> Schedule Trip
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Trip</DialogTitle>
                <DialogDescription>
                  Assign an available bus to a route and designate departure/arrival schedules.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="routeId">Route</Label>
                    <select 
                      id="routeId"
                      className="flex h-9 w-full rounded-md border border-input bg-background text-foreground [&>option]:bg-background [&>option]:text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                      className="flex h-9 w-full rounded-md border border-input bg-background text-foreground [&>option]:bg-background [&>option]:text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Trip</DialogTitle>
              <DialogDescription>
                Update bus assignment or schedule times.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="editRouteId">Route</Label>
                  <select 
                    id="editRouteId"
                    className="flex h-9 w-full rounded-md border border-input bg-background text-foreground [&>option]:bg-background [&>option]:text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                  <Label htmlFor="editBusId">Bus</Label>
                  <select 
                    id="editBusId"
                    className="flex h-9 w-full rounded-md border border-input bg-background text-foreground [&>option]:bg-background [&>option]:text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                    <Label htmlFor="editDeparture">Departure</Label>
                    <Input 
                      id="editDeparture" 
                      type="datetime-local"
                      value={formData.departureTime}
                      onChange={(e) => setFormData({...formData, departureTime: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editArrival">Arrival</Label>
                    <Input 
                      id="editArrival" 
                      type="datetime-local"
                      value={formData.arrivalTime}
                      onChange={(e) => setFormData({...formData, arrivalTime: e.target.value})}
                      required 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Trip"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/60">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search route or bus number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/80"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {["ALL", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].map((status) => (
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
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Table */}
      <div className="rounded-xl card-linear overflow-hidden shadow-xs tabular-nums">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60 bg-secondary/30">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Route & Transit Line</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Bus</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Departure & Arrival</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dispatch Status</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
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
              ) : filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <CalendarDays className="h-8 w-8 text-muted-foreground/50 mb-1" />
                      <p className="text-sm font-medium text-foreground">No trips match your filter</p>
                      <p className="text-xs text-muted-foreground">Try clearing your search query or selecting a different status.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip: any) => (
                  <TableRow key={trip.id} className="hover:bg-secondary/40 border-b border-border/40 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center text-sm font-semibold text-foreground">
                        <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                        {trip.route?.name || "Transit Route"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-secondary/80 border border-border/60">
                        {trip.bus?.number || "Unassigned"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          <span>Dep: {new Date(trip.departureTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                          <span>Arr: {new Date(trip.arrivalTime).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-semibold ${getStatusColor(trip.status)}`}>
                        {trip.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary cursor-pointer"
                        onClick={() => openEdit(trip)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete this trip schedule?`)) {
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
    </div>
  )
}
