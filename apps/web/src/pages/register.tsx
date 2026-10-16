import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { toast } from "sonner"
import { Bus, Loader2, Sparkles, User, Mail, Lock } from "lucide-react"

import { useAuthStore } from "@/stores/auth.store"
import { api } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"

export function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post("/auth/signup", { name, email, password })
      login(data.user, data.token)
      toast.success("Account created successfully! Welcome to Buzo Luxe.")
      navigate("/")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to register")
    } finally {
      setLoading(false)
    }
  }

  const fillTestUser = () => {
    const randomSuffix = Math.floor(Math.random() * 900) + 100
    setName(`Traveler ${randomSuffix}`)
    setEmail(`passenger${randomSuffix}@buzo.com`)
    setPassword("password123")
    toast.info("Sample traveler credentials generated")
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
          <CardTitle className="text-2xl font-black tracking-tight text-foreground">Create Your Account</CardTitle>
          <CardDescription className="text-xs">
            Join Buzo Luxe for real-time seat reservation & live coach telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          {/* Quick Generate Demo User Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={fillTestUser}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate Sample Traveler
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3 text-primary" /> Full Name
              </Label>
              <Input 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Eleanor Vance" 
                className="h-11 rounded-xl bg-background/80"
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3 text-primary" /> Email Address
              </Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="eleanor@buzo.com" 
                className="h-11 rounded-xl bg-background/80"
                required 
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3 text-primary" /> Password
              </Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="h-11 rounded-xl bg-background/80"
                required 
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-sm font-bold rounded-xl shadow-lg shadow-primary/25" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...
                </>
              ) : (
                "Create Account & Start Booking"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-muted-foreground border-t border-border/50 bg-muted/10 p-4">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline ml-1 font-bold">
            Log in
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
