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
  LogOut,
  Sparkles
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Live Fleet Radar", href: "/live-map", icon: MapIcon, badge: "LIVE" },
  { name: "Trips & Dispatch", href: "/trips", icon: CalendarDays },
  { name: "Passenger Bookings", href: "/bookings", icon: CreditCard },
  { name: "Fleet Buses", href: "/buses", icon: Bus },
  { name: "Drivers", href: "/drivers", icon: Users },
  { name: "Transit Routes", href: "/routes", icon: RouteIcon },
  { name: "Stops & Stations", href: "/stops", icon: MapPin },
]

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:z-20",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-border/40">
        <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
          <Bus className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-foreground font-sans">Buzo</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-secondary text-secondary-foreground border border-border">
              Operations
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Fleet Dispatch Control</p>
        </div>
      </div>
      
      {/* Navigation Links */}
      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
            Control Center
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )
                }
                onClick={() => setIsOpen(false)}
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <item.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={cn(
                        "text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full tracking-wider",
                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Engine status teaser */}
        <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/70 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Sparkles className="w-3.5 h-3.5 text-foreground" />
            <span>Telemetry Link</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Real-time WebSocket telemetry syncing with Passenger portal and Driver cockpit.
          </p>
        </div>
      </div>
      
      {/* Footer / Account */}
      <div className="border-t border-border/60 p-4 space-y-3 bg-secondary/15">
        <div className="flex items-center gap-2.5 px-1">
          <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
            {user?.name?.[0] || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user?.name || "Admin"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email || "admin@buzo.com"}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="w-full justify-center text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border-border/60 cursor-pointer"
          onClick={logout}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign Out of Admin
        </Button>
      </div>
    </aside>
  )
}
