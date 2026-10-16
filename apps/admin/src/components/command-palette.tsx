import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  Search, 
  MapPin, 
  Bus, 
  Navigation, 
  Calendar, 
  BookOpen, 
  Users, 
  Radio, 
  ExternalLink,
  X,
  LayoutDashboard
} from "lucide-react"

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")

  // Quick navigation items
  const commands = [
    { label: "Fleet Command Dashboard", category: "Navigation", path: "/", icon: LayoutDashboard },
    { label: "Live Telemetry Radar Map", category: "Navigation", path: "/live-map", icon: Radio },
    { label: "Scheduled Trips & Dispatch", category: "Management", path: "/trips", icon: Calendar },
    { label: "Passenger Bookings & Manifest", category: "Management", path: "/bookings", icon: BookOpen },
    { label: "Active Bus Fleet", category: "Fleet", path: "/buses", icon: Bus },
    { label: "Assigned Drivers", category: "Fleet", path: "/drivers", icon: Users },
    { label: "Transit Routes & Corridors", category: "Network", path: "/routes", icon: Navigation },
    { label: "Station Stops Database", category: "Network", path: "/stops", icon: MapPin },
  ]

  const externalPortals = [
    { label: "Open Passenger Web Portal", url: "http://localhost:5173", port: "5173" },
    { label: "Open Driver Cockpit HUD", url: "http://localhost:5175", port: "5175" },
  ]

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-card/95 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center px-4 py-3 border-b border-border/60 gap-3">
          <Search className="w-4 h-4 text-primary shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search commands, dispatch actions, or navigation... (e.g. trips, fleet, radar)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium"
          />
          {query && (
            <button 
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-secondary/60 rounded border border-border/60">
            ESC
          </kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1.5">
            Mission Operations
          </div>
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(cmd.path)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span>{cmd.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary/40 border border-border/40">
                    {cmd.category}
                  </span>
                </button>
              )
            })
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground font-medium">
              No matching commands found for "{query}"
            </div>
          )}

          {/* External Links */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 pt-3 pb-1 border-t border-border/40">
            External Portals
          </div>
          {externalPortals.map((portal, pIdx) => (
            <a
              key={pIdx}
              href={portal.url}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                <span>{portal.label}</span>
              </div>
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                :{portal.port}
              </span>
            </a>
          ))}
        </div>

        <div className="px-4 py-2 bg-secondary/30 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span>Linear Precision Control</span>
          <span>Press ↑↓ to navigate • ↵ to select</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
