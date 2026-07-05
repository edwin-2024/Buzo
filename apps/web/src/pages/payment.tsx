import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { CreditCard, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/axios"

export function PaymentPage() {
  const [searchParams] = useSearchParams()
  const tripId = searchParams.get("tripId")
  const navigate = useNavigate()
  
  const [isProcessing, setIsProcessing] = useState(false)

  if (!tripId) {
    return (
      <div className="container py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Invalid Payment Session</h2>
        <p className="text-muted-foreground mb-8">No trip ID was provided for checkout.</p>
        <Button onClick={() => navigate("/")}>Return Home</Button>
      </div>
    )
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Simulate network delay for realistic feel
      await new Promise(resolve => setTimeout(resolve, 1500))

      const { data } = await api.post("/payments/create-checkout-session", { tripId })
      
      if (data.success) {
        toast.success("Payment successful! Your seats are confirmed.")
        navigate(data.url || "/my-bookings")
      }
    } catch (error) {
      console.error("Payment failed", error)
      toast.error("Payment failed. Please try again.")
      setIsProcessing(false)
    }
  }

  return (
    <div className="container max-w-lg mx-auto py-12 px-4">
      <Card className="border-primary/20 shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Complete Payment</CardTitle>
          <CardDescription>
            Enter your card details to confirm your booking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 mb-6 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">₹1,250</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Trip ID</p>
              <p className="font-mono text-xs">{tripId.slice(0, 8)}...</p>
            </div>
          </div>

          <form id="payment-form" onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name on Card</Label>
              <Input id="name" placeholder="John Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card">Card Number</Label>
              <Input id="card" placeholder="0000 0000 0000 0000" maxLength={19} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input id="expiry" placeholder="MM/YY" maxLength={5} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" type="password" placeholder="123" maxLength={4} required />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            form="payment-form" 
            type="submit" 
            className="w-full h-12 text-lg" 
            disabled={isProcessing}
          >
            {isProcessing ? (
              "Processing..."
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" /> Pay ₹1,250
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            This is a secure, encrypted mock payment gateway. No real money will be charged.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
