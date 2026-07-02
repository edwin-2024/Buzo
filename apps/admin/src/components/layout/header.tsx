import { useLocation } from "react-router-dom"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"

export function Header() {
  const location = useLocation()
  
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

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/80 px-4 shadow-sm backdrop-blur-md sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-x-4 lg:gap-x-6 justify-between">
        <h1 className="text-xl font-semibold leading-7">{getPageTitle()}</h1>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Button>
          
          {/* Add a generic avatar placeholder */}
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
            AD
          </div>
        </div>
      </div>
    </header>
  )
}
