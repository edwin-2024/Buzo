import { useState, useRef, useEffect } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { Bus, LogOut, Menu, X, Shield, Truck, Ticket, Radio } from "lucide-react"

import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"

export function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
      isActive
        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
    }`

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Monogram */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25 group-hover:scale-105 transition-transform duration-200">
              <Bus className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight leading-none text-foreground flex items-center gap-1.5">
                BUZO
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  Luxe
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                Intercity Express
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-1.5 items-center bg-secondary/40 p-1 rounded-full border border-border/40">
            <NavLink to="/search" className={navClass}>
              Search Trips
            </NavLink>
            {user && (
              <>
                <NavLink to="/my-bookings" className={navClass}>
                  <Ticket className="w-3.5 h-3.5" />
                  My Bookings
                </NavLink>
                <NavLink to="/track" className={navClass}>
                  <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  Live Radar
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Action Controls & User Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Portal Switchers */}
          {user?.role === "ADMIN" && (
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 hover:border-primary/40 transition-all shadow-xs"
              title="Open Admin Portal"
            >
              <Shield className="w-3.5 h-3.5" /> Admin Portal ↗
            </a>
          )}
          {user?.role === "DRIVER" && (
            <a
              href="http://localhost:5175"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-xs"
              title="Open Driver Portal"
            >
              <Truck className="w-3.5 h-3.5" /> Driver App ↗
            </a>
          )}

          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2.5 p-1 pr-2.5 rounded-full bg-secondary/60 hover:bg-secondary border border-border/60 transition-colors cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/30 to-blue-500/30 border border-primary/30 flex items-center justify-center font-black text-xs text-primary shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-foreground leading-tight max-w-[120px] truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono leading-none">
                    {user.role}
                  </div>
                </div>
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-card border border-border/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-border/50">
                    <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false)
                        navigate("/my-bookings")
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary/70 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5 text-primary" /> My Tickets & Passes
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false)
                        navigate("/track")
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-secondary/70 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5 text-emerald-500" /> Live GPS Radar
                    </button>
                  </div>
                  <div className="pt-1 border-t border-border/50">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false)
                        logout()
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="font-semibold text-xs rounded-full">
                  Log In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="font-bold text-xs rounded-full shadow-md shadow-primary/25">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-xl h-9 w-9"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-border/60 bg-card/95 backdrop-blur-xl px-4 py-4 space-y-3 animate-in slide-in-from-top duration-200">
          <Link
            to="/search"
            className="flex items-center gap-2 text-sm font-semibold p-2.5 rounded-xl text-foreground hover:bg-secondary/70 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Bus className="w-4 h-4 text-primary" /> Search Trips
          </Link>
          {user && (
            <>
              <Link
                to="/my-bookings"
                className="flex items-center gap-2 text-sm font-semibold p-2.5 rounded-xl text-foreground hover:bg-secondary/70 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Ticket className="w-4 h-4 text-primary" /> My Bookings
              </Link>
              <Link
                to="/track"
                className="flex items-center gap-2 text-sm font-semibold p-2.5 rounded-xl text-foreground hover:bg-secondary/70 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Radio className="w-4 h-4 text-emerald-500" /> Live Tracking
              </Link>
            </>
          )}
          {user?.role === "ADMIN" && (
            <a
              href="http://localhost:5174"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-semibold p-2.5 rounded-xl text-primary bg-primary/10"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Shield className="w-4 h-4" /> Admin Portal ↗
            </a>
          )}
          {user?.role === "DRIVER" && (
            <a
              href="http://localhost:5175"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-semibold p-2.5 rounded-xl text-emerald-500 bg-emerald-500/10"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Truck className="w-4 h-4" /> Driver Portal ↗
            </a>
          )}
        </div>
      )}
    </header>
  )
}
