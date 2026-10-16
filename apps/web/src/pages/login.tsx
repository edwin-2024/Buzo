import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { toast } from "sonner"
import { Bus, Eye, EyeOff, Loader2, Sparkles, Shield, Truck, User } from "lucide-react"

import { useAuthStore } from "@/stores/auth.store"
import { api } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const loginWithCreds = async (eEmail: string, ePass: string) => {
    setLoading(true)
    try {
      const { data } = await api.post("/auth/login", { email: eEmail, password: ePass })
      login(data.user, data.token)
      toast.success(`Welcome back, ${data.user.name}!`)
      if (data.user.role === "ADMIN") {
        window.location.href = "http://localhost:5174"
      } else if (data.user.role === "DRIVER") {
        window.location.href = "http://localhost:5175"
      } else {
        navigate("/")
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to login")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await loginWithCreds(email, password)
  }

  const fillDemo = (role: "PASSENGER" | "DRIVER" | "ADMIN") => {
    if (role === "PASSENGER") {
      setEmail("passenger@buzo.com")
      setPassword("password123")
      loginWithCreds("passenger@buzo.com", "password123")
    } else if (role === "DRIVER") {
      window.location.href = "http://localhost:5175/login"
    } else {
      window.location.href = "http://localhost:5174/login"
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <Card className="w-full max-w-md border-2 border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden relative">
        <CardHeader className="space-y-2 text-center pb-6 border-b border-border/50 bg-muted/10">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25 mb-1">
            <Bus className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-foreground">Welcome to Buzo</CardTitle>
          <CardDescription className="text-xs">
            Sign in to manage bookings, download passes, and track coaches.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          {/* 1-Click Fast Demo Credentials Pill Box */}
          <div className="space-y-2 bg-secondary/50 p-3.5 rounded-2xl border border-border/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Instant Demo Sign-In
              </span>
              <span className="text-[10px] text-muted-foreground">Click to fill</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("PASSENGER")}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-background/80 hover:bg-primary hover:text-primary-foreground border border-border text-xs font-semibold transition-all cursor-pointer shadow-2xs text-muted-foreground hover:shadow-xs active:scale-95"
              >
                <User className="w-3 h-3 text-primary" /> Passenger
              </button>
              <button
                type="button"
                onClick={() => fillDemo("DRIVER")}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-background/80 hover:bg-emerald-600 hover:text-white border border-border text-xs font-semibold transition-all cursor-pointer shadow-2xs text-muted-foreground hover:shadow-xs active:scale-95"
              >
                <Truck className="w-3 h-3 text-emerald-500" /> Driver
              </button>
              <button
                type="button"
                onClick={() => fillDemo("ADMIN")}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-background/80 hover:bg-blue-600 hover:text-white border border-border text-xs font-semibold transition-all cursor-pointer shadow-2xs text-muted-foreground hover:shadow-xs active:scale-95"
              >
                <Shield className="w-3 h-3 text-blue-500" /> Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="passenger@buzo.com" 
                className="h-11 rounded-xl bg-background/80"
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl bg-background/80 pr-10"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-sm font-bold rounded-xl shadow-lg shadow-primary/25" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-muted-foreground border-t border-border/50 bg-muted/10 p-4">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-primary hover:underline ml-1 font-bold">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
