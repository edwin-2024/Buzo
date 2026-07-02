import { Link } from "react-router-dom"
import { Bus, Map, Ticket, User, LogOut } from "lucide-react"

import { useAuthStore } from "@/stores/auth.store"
import { Button } from "@/components/ui/button"

export function Header() {
  const { user, logout } = useAuthStore()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <Bus className="h-6 w-6 text-primary" />
            <span className="inline-block font-bold">Buzo</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link
              to="/search"
              className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Search Trips
            </Link>
            {user && (
              <>
                <Link
                  to="/my-bookings"
                  className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  My Bookings
                </Link>
                <Link
                  to="/track"
                  className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Live Tracking
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium hidden sm:inline-block">
                {user.name}
              </span>
              <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
                <LogOut className="h-5 w-5" />
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
    </header>
  )
}
