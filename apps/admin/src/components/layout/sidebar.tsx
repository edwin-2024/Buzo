import { NavLink } from "react-router-dom"
import { 
  Bus, 
  MapPin, 
  Route as RouteIcon, 
  Users, 
  Map as MapIcon, 
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Stops", href: "/stops", icon: MapPin },
  { name: "Routes", href: "/routes", icon: RouteIcon },
  { name: "Buses", href: "/buses", icon: Bus },
  { name: "Drivers", href: "/drivers", icon: Users },
  { name: "Trips", href: "/trips", icon: CalendarDays },
  { name: "Bookings", href: "/bookings", icon: CreditCard },
  { name: "Live Map", href: "/live-map", icon: MapIcon },
]

export function Sidebar() {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r bg-background/80 backdrop-blur-md">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Bus className="mr-2 h-6 w-6 text-primary" />
        <span className="text-xl font-bold tracking-tight">Buzo Admin</span>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
      
      <div className="border-t p-4">
        <div className="mb-4 px-2 text-sm text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">{user?.name}</span>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
