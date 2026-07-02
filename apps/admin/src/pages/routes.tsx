import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, Map, Navigation } from "lucide-react"
import { toast } from "sonner"

import { routesApi } from "@/api/routes"
import { stopsApi } from "@/api/stops"
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

export function RoutesPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formData, setFormData] = useState({ name: "", stopsInput: "" })

  const { data: routes, isLoading } = useQuery({
    queryKey: ["routes"],
    queryFn: routesApi.getAll,
  })

  // In a real UI we would have a multiselect. For this MVP we just ask for stop IDs
  const { data: stops } = useQuery({
    queryKey: ["stops"],
    queryFn: stopsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (newRoute: any) => {
      // parse comma separated stops and generate routeStop array
      const stopIds = newRoute.stopsInput.split(",").map((s: string) => s.trim()).filter(Boolean)
      const formattedStops = stopIds.map((id: string, index: number) => ({
        stopId: id,
        order: index + 1,
        distanceFromStart: index * 10 // Mock distance for now
      }))
      
      return routesApi.create({
        name: newRoute.name,
        stops: formattedStops
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] })
      setIsAddOpen(false)
      setFormData({ name: "", stopsInput: "" })
      toast.success("Route created successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create route")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => routesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] })
      toast.success("Route deleted")
    },
    onError: () => toast.error("Failed to delete route")
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Network: Routes</h2>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create New Route</DialogTitle>
              <DialogDescription>
                Define a new route by connecting multiple stops.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Route Name</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Majestic to Whitefield" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stops">Stops (Comma separated IDs)</Label>
                  <Input 
                    id="stops" 
                    value={formData.stopsInput}
                    onChange={(e) => setFormData({...formData, stopsInput: e.target.value})}
                    placeholder="stopId1, stopId2, stopId3..." 
                    required 
                  />
                  <div className="mt-2 text-xs text-muted-foreground border rounded-md p-2 h-32 overflow-y-auto">
                    <p className="font-semibold mb-1">Available Stops:</p>
                    {stops?.map((stop: any) => (
                      <div key={stop.id} className="flex justify-between items-center py-1 border-b last:border-0">
                        <span>{stop.name}</span>
                        <code className="bg-muted px-1 rounded text-[10px]">{stop.id}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Route"}
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
              <TableHead>Route Name</TableHead>
              <TableHead>Stops Count</TableHead>
              <TableHead>Path</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[300px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : routes?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No routes defined.
                </TableCell>
              </TableRow>
            ) : (
              routes?.map((route: any) => {
                const sortedStops = [...route.stops].sort((a: any, b: any) => a.order - b.order)
                return (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Map className="mr-2 h-4 w-4 text-primary" />
                        {route.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{route.stops.length} stops</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap text-sm text-muted-foreground max-w-md">
                        {sortedStops.map((rs: any, i: number) => (
                          <span key={rs.stopId} className="flex items-center">
                            {rs.stop.name}
                            {i < sortedStops.length - 1 && <Navigation className="mx-1 h-3 w-3 rotate-90" />}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete route ${route.name}?`)) {
                            deleteMutation.mutate(route.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
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
  )
}
