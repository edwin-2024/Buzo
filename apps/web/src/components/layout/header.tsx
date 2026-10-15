import { useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { Bus, LogOut, Menu, X, Shield, Truck } from "lucide-react"

import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"

export function Header() {
  const { user, logout } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center text-sm font-semibold transition-colors ${
      isActive
        ? "text-primary border-b-2 border-primary py-1"
        : "text-muted-foreground hover:text-foreground py-1"
    }`

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Bus className="h-5 w-5" />
            </div>
            <span className="inline-block font-extrabold text-lg tracking-tight">Buzo</span>
          </Link>
          <nav className="hidden md:flex gap-6 items-center">
            <NavLink to="/search" className={navClass}>
              Search Trips
            </NavLink>
            {user && (
              <>
                <NavLink to="/my-bookings" className={navClass}>
                  My Bookings
                </NavLink>
                <NavLink to="/track" className={navClass}>
                  Live Tracking
                </NavLink>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {user ? (
            <div className="flex items-center gap-3">
              {user.role === "ADMIN" && (
                <a
                  href="http://localhost:5174"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                  title="Open Admin Dashboard"
                >
                  <Shield className="w-3 h-3" /> Admin Portal ↗
                </a>
              )}
              {user.role === "DRIVER" && (
                <a
                  href="http://localhost:5175"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  title="Open Driver Portal"
                >
                  <Truck className="w-3 h-3" /> Driver App ↗
                </a>
              )}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold hidden sm:inline-block">
                  {user.name}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Sign out" className="rounded-xl">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link to="/register">
                <Button>Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden border-b bg-background px-4 py-4 space-y-4">
          <Link to="/search" className="block text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>Search Trips</Link>
          {user && (
            <>
              <Link to="/my-bookings" className="block text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>My Bookings</Link>
              <Link to="/track" className="block text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>Live Tracking</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
