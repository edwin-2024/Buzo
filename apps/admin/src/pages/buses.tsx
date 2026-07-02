import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

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

export function BusesPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formData, setFormData] = useState({ number: "", capacity: "" })

  const { data: buses, isLoading } = useQuery({
    queryKey: ["buses"],
    queryFn: busesApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (newBus: any) => busesApi.create({
      number: newBus.number,
      capacity: parseInt(newBus.capacity)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] })
      setIsAddOpen(false)
      setFormData({ number: "", capacity: "" })
      toast.success("Bus created successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create bus")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => busesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buses"] })
      toast.success("Bus deleted")
    },
    onError: () => toast.error("Failed to delete bus")
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Fleet: Buses</h2>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Bus
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Bus</DialogTitle>
              <DialogDescription>
                Register a new bus into the system fleet.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="number">Bus Number (Registration)</Label>
                  <Input 
                    id="number" 
                    value={formData.number}
                    onChange={(e) => setFormData({...formData, number: e.target.value})}
                    placeholder="e.g. KA-01-AB-1234" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="capacity">Seating Capacity</Label>
                  <Input 
                    id="capacity" 
                    type="number" 
                    min="1"
                    max="100"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    placeholder="40" 
                    required 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Bus"}
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
              <TableHead>Bus Number</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Assigned Driver</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : buses?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No buses found in fleet.
                </TableCell>
              </TableRow>
            ) : (
              buses?.map((bus: any) => (
                <TableRow key={bus.id}>
                  <TableCell className="font-medium">{bus.number}</TableCell>
                  <TableCell>{bus.capacity} seats</TableCell>
                  <TableCell>
                    {bus.driver ? (
                       <Badge variant="outline">{bus.driver.user?.name || 'Driver'}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete bus ${bus.number}?`)) {
                          deleteMutation.mutate(bus.id)
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
