import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Navigation, Loader2, Eye, EyeOff, Zap, ExternalLink, ShieldCheck } from "lucide-react"

import { useAuthStore } from "../stores/auth.store"
import { api } from "../lib/axios"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const fillCredentials = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword("password123")
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { data } = await api.post("/auth/login", { email, password })
      
      if (data.user.role !== "DRIVER" && data.user.role !== "ADMIN") {
         throw new Error("Unauthorized. Driver access credentials required.");
      }

      setAuth(data.token, data.user)
      navigate("/")
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to authenticate driver")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Portal switcher bar */}
        <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Buzo Driver Cockpit
          </span>
          <div className="flex items-center gap-2">
            <a 
              href="http://localhost:5173" 
              className="hover:text-foreground transition-colors flex items-center gap-1"
              target="_blank" 
              rel="noreferrer"
            >
              Passenger App <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span>•</span>
            <a 
              href="http://localhost:5174" 
              className="hover:text-foreground transition-colors flex items-center gap-1"
              target="_blank" 
              rel="noreferrer"
            >
              Admin Portal <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        <div className="bg-card/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-border/60 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 shadow-inner">
              <Navigation className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">In-Cab Cockpit</h2>
            <p className="text-xs text-muted-foreground">
              Sign in to manage assigned routes, broadcast live GPS, and report transit delays.
            </p>
          </div>

          {/* Quick Demo Autofill Helpers */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fillCredentials("driver@buzo.com")}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-primary" />
              Fill Demo Driver (driver@buzo.com)
            </button>
            <button
              type="button"
              onClick={() => fillCredentials("admin@buzo.com")}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Use Admin Account (admin@buzo.com)
            </button>
          </div>
          
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs text-center border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Driver Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="driver@buzo.com"
                  className="w-full px-3 py-2 bg-background/60 text-foreground border border-input rounded-xl shadow-xs text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-background/60 text-foreground border border-input rounded-xl shadow-xs text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all duration-150 active:scale-[0.98] shadow-md cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "Authenticating Cockpit..." : "Enter Driver Cockpit"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
