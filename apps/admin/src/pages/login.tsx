import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Bus, Loader2, Eye, EyeOff, ShieldCheck, Zap, ExternalLink } from "lucide-react"

import { useAuthStore } from "@/stores/auth.store"
import { authApi } from "@/api/auth"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  })

  const fillAdminCredentials = () => {
    setValue("email", "admin@buzo.com")
    setValue("password", "password123")
    toast.info("Filled admin demo credentials!")
  }

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      const response = await authApi.login(data)
      
      // Since it's the admin dashboard, we expect them to be an ADMIN
      if (response.user.role !== "ADMIN") {
        toast.error("Access denied. Admin privileges required.")
        return
      }

      login(response.user, response.token)
      toast.success("Welcome back, Operations Command!")
      navigate("/")
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Invalid credentials. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-600/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Portal jumps */}
        <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Buzo Operations Command
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
              href="http://localhost:5175" 
              className="hover:text-foreground transition-colors flex items-center gap-1"
              target="_blank" 
              rel="noreferrer"
            >
              Driver Cockpit <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        <Card className="border-border/60 bg-card/90 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 shadow-inner">
              <Bus className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Fleet Admin Portal
            </CardTitle>
            <CardDescription className="text-sm">
              Sign in with administrative privileges to manage lines, dispatch coaches, and audit revenue.
            </CardDescription>
          </CardHeader>

          {/* Quick Demo Autofill Bar */}
          <div className="px-6 pb-2">
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-primary" />
              Fill Demo Admin Credentials (admin@buzo.com)
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Admin Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@buzo.com"
                  {...register("email")}
                  className={`bg-background/60 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {errors.email && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    className={`bg-background/60 pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button className="w-full font-semibold shadow-md" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enter Command Center
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
