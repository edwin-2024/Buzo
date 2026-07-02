import { useQuery } from "@tanstack/react-query"
import { 
  Bus, 
  MapPin, 
  Route as RouteIcon, 
  Users, 
  CalendarDays,
  CreditCard 
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  isLoading 
}: { 
  title: string
  value?: number 
  icon: any
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-[60px]" />
        ) : (
          <div className="text-2xl font-bold">{value || 0}</div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { data: stops, isLoading: stopsLoading } = useQuery({
    queryKey: ["stops"],
    queryFn: stopsApi.getAll,
  })

  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ["routes"],
    queryFn: routesApi.getAll,
  })

  const { data: buses, isLoading: busesLoading } = useQuery({
    queryKey: ["buses"],
    queryFn: busesApi.getAll,
  })

  const { data: drivers, isLoading: driversLoading } = useQuery({
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Total Stops" 
          value={stops?.length} 
          icon={MapPin} 
          isLoading={stopsLoading} 
        />
        <StatCard 
          title="Total Routes" 
          value={routes?.length} 
          icon={RouteIcon} 
          isLoading={routesLoading} 
        />
        <StatCard 
          title="Total Buses" 
          value={buses?.length} 
          icon={Bus} 
          isLoading={busesLoading} 
        />
        <StatCard 
          title="Total Drivers" 
          value={drivers?.length} 
          icon={Users} 
          isLoading={driversLoading} 
        />
        <StatCard 
          title="Total Trips" 
          value={trips?.length} 
          icon={CalendarDays} 
          isLoading={tripsLoading} 
        />
        <StatCard 
          title="Total Bookings" 
          value={bookings?.length} 
          icon={CreditCard} 
          isLoading={bookingsLoading} 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="flex h-[300px] items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg m-4">
              Charts and activity feed will go here
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
               <div className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">System initialized</p>
                    <p className="text-sm text-muted-foreground">Just now</p>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
