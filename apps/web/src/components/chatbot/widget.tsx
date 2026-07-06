import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/axios"

interface Message {
  role: "user" | "assistant"
  content: string
  toolData?: any
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("buzo-chat-history");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
    { role: "assistant", content: "Hi there! I'm Buzo's AI assistant. I can help you find buses, check schedules, or answer questions about your trip. How can I help you today?" }
    ];
  });
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, isOpen, scrollToBottom])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg = input.trim()
    setInput("")
    
    // Extract history before adding the new message
    const history = messages
      // Only include messages that have content, skip tool messages without display content if any
      .filter(m => m.content && m.content.trim() !== "")
      .map(m => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: userMsg }])
    setIsLoading(true)

    try {
      const { data } = await api.post("/chat", { 
        message: userMsg,
        history
      })

      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: data.response || "I processed your request!",
          toolData: data
        }
      ])
    } catch (error: any) {
      console.error("Chat error:", error)

      // Check if it's a 401 auth error
      if (error.response?.status === 401) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "You need to be logged in to chat with me. Please log in first!" }
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again in a moment." }
        ])
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:shadow-primary/40"
          style={{ background: "linear-gradient(135deg, hsl(15 90% 58%), hsl(25 95% 50%))" }}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[360px] sm:w-[400px] h-[520px] max-h-[calc(100vh-48px)] bg-card border border-border/60 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div
            className="p-4 flex items-center justify-between text-white"
            style={{ background: "linear-gradient(135deg, hsl(15 90% 58%), hsl(25 95% 50%))" }}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Buzo Assistant</h3>
                <p className="text-xs opacity-80">Powered by AI</p>
              </div>
            </div>
            <button
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full h-8 w-8 flex items-center justify-center transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div
                  className={`rounded-2xl px-4 py-2.5 max-w-[78%] text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                  
                  {/* Payment Button Injection */}
                  {msg.toolData?.tool === "bookSeat" && msg.toolData?.data?.tripId && !msg.toolData?.data?.error && (
                    <div className="mt-3">
                      <Button 
                        size="sm" 
                        className="w-full bg-white text-primary hover:bg-white/90"
                        onClick={async () => {
                          try {
                            const { data } = await api.post("/payments/create-checkout-session", {
                              tripId: msg.toolData.data.tripId
                            });
                            if (data.url) {
                              window.location.href = data.url;
                            }
                          } catch (e) {
                            console.error("Payment failed", e);
                            alert("Payment failed. Please check your bookings page.");
                          }
                        }}
                      >
                        Proceed to Payment
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-end gap-2">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            )}

            {/* Invisible anchor for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-border/60 bg-background">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Ask about buses, routes..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="rounded-full bg-muted border-transparent focus-visible:ring-primary text-foreground placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="rounded-full flex-shrink-0 h-10 w-10"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}



