import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, Bus } from "lucide-react"
import { toast } from "sonner"

import { driversApi } from "@/api/drivers"
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

export function DriversPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<any>(null)
  
  const [formData, setFormData] = useState({ userId: "" })
  const [assignData, setAssignData] = useState({ busId: "" })

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: driversApi.getAll,
  })

  // We need users with PASSENGER role to upgrade them, but for this admin UI 
  // we'll just ask for a User ID since we haven't built a users API endpoint yet
  
  const { data: buses } = useQuery({
    queryKey: ["buses"],
    queryFn: busesApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (newDriver: any) => driversApi.create(newDriver),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] })
      setIsAddOpen(false)
      setFormData({ userId: "" })
      toast.success("Driver created successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create driver. Ensure the user ID is valid.")
    }
  })

  const assignMutation = useMutation({
    mutationFn: (data: {id: string, busId: string}) => driversApi.assignBus(data.id, data.busId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] })
      queryClient.invalidateQueries({ queryKey: ["buses"] }) // bus driver status changes
      setIsAssignOpen(false)
      setAssignData({ busId: "" })
      toast.success("Bus assigned to driver successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to assign bus.")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => driversApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] })
      toast.success("Driver deleted")
    },
    onError: () => toast.error("Failed to delete driver")
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDriver) {
      assignMutation.mutate({ id: selectedDriver.id, busId: assignData.busId })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Fleet: Drivers</h2>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Driver</DialogTitle>
              <DialogDescription>
                Promote an existing user to a driver.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input 
                    id="userId" 
                    value={formData.userId}
                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                    placeholder="User ID (cuid)" 
                    required 
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be an existing user's ID.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Registering..." : "Register Driver"}
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assigned Bus</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : drivers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No drivers found.
                </TableCell>
              </TableRow>
            ) : (
              drivers?.map((driver: any) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.user.name}</TableCell>
                  <TableCell>{driver.user.email}</TableCell>
                  <TableCell>
                    {driver.assignedBus ? (
                       <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                         {driver.assignedBus.number}
                       </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Dialog open={isAssignOpen && selectedDriver?.id === driver.id} onOpenChange={(open) => {
                      setIsAssignOpen(open)
                      if (!open) setSelectedDriver(null)
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8"
                          onClick={() => {
                            setSelectedDriver(driver)
                            setIsAssignOpen(true)
                          }}
                        >
                          <Bus className="mr-2 h-4 w-4" />
                          Assign Bus
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Bus to {driver.user.name}</DialogTitle>
                          <DialogDescription>
                            Select a bus for this driver to operate.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAssign}>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="busId">Bus</Label>
                              <select 
                                id="busId"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={assignData.busId}
                                onChange={(e) => setAssignData({ busId: e.target.value })}
                                required
                              >
                                <option value="" disabled>Select a bus</option>
                                {buses?.map((bus: any) => (
                                  <option key={bus.id} value={bus.id}>
                                    {bus.number} ({bus.capacity} seats) {bus.driver ? "- Already assigned" : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={assignMutation.isPending}>
                              {assignMutation.isPending ? "Assigning..." : "Assign Bus"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove driver privileges from ${driver.user.name}?`)) {
                          deleteMutation.mutate(driver.id)
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
