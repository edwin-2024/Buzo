import { useState } from "react"
import { useLocation } from "react-router-dom"
import { Bell, Menu, ExternalLink, Radio, Search, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth.store"
import { CommandPalette } from "@/components/command-palette"
import { ModeToggle } from "./mode-toggle"

export function Header({ setIsSidebarOpen }: { setIsSidebarOpen: (v: boolean) => void }) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const [commandOpen, setCommandOpen] = useState(false)
  
  // Create a readable title from pathname
  const getPageTitle = () => {
    const path = location.pathname
    if (path === "/") return "Dashboard"
    
    // Convert e.g., "/live-map" to "Live Map"
    return path
      .substring(1)
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD"

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-border/60 bg-background/85 px-4 shadow-xs backdrop-blur-md sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-x-4 lg:gap-x-6 justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open sidebar</span>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">{getPageTitle()}</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">Buzo Fleet Operations & Control</p>
          </div>
        </div>
        
        <div className="flex items-center gap-x-3 sm:gap-x-4">
          {/* Linear / Raycast Style Quick Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-mono border border-border/70 transition-all cursor-pointer shadow-2xs hover:border-primary/40 active:scale-95"
            title="Open Command Palette (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-primary" />
            <span className="hidden md:inline">Quick Jump</span>
            <kbd className="px-1.5 py-0.5 rounded bg-background text-[10px] font-mono border border-border/80 text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {/* Live System Beacon */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Telemetry Online</span>
          </div>

          {/* Quick jump to Passenger & Driver apps */}
          <div className="hidden lg:flex items-center gap-2 border-l border-border/60 pl-3">
            <a 
              href="http://localhost:5173" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-secondary/60 transition-colors"
            >
              Passenger App <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
            <a 
              href="http://localhost:5175" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-secondary/60 transition-colors"
            >
              Driver Cockpit <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>

          <ModeToggle />

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <span className="sr-only">View notifications</span>
            <Bell className="h-4 w-4" aria-hidden="true" />
          </Button>
          
          {/* User profile avatar */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shadow-xs">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-foreground leading-tight flex items-center gap-1">
                {user?.name || "Administrator"}
                <ShieldCheck className="w-3 h-3 text-primary" />
              </div>
              <div className="text-[10px] text-muted-foreground font-mono leading-tight">Admin Level 1</div>
            </div>
          </div>
        </div>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </header>
  )
}
