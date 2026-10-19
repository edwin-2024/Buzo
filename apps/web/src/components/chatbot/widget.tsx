import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, Bot, User, Loader2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/axios"
import { useAuthStore } from "@/stores/auth.store"

interface Message {
  role: "user" | "assistant"
  content: string
  toolData?: any
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Hi there! I'm Buzo's AI assistant. I can help you find buses, check schedules, or answer questions about your trip. How can I help you today?"
}

function renderFormattedContent(text: string) {
  if (!text) return null
  const lines = text.split("\n")
  return lines.map((line, lIdx) => {
    const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ")
    const content = isBullet ? line.trim().substring(2) : line

    const parts = content.split(/(\*\*.*?\*\*)/g)
    const parsedLine = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} className="font-extrabold">{part.slice(2, -2)}</strong>
      }
      return part
    })

    if (isBullet) {
      return (
        <div key={lIdx} className="flex items-start gap-1.5 my-0.5 pl-1">
          <span className="text-primary font-black">•</span>
          <span>{parsedLine}</span>
        </div>
      )
    }

    return (
      <div key={lIdx} className={line.trim() === "" ? "h-2" : "my-0.5"}>
        {parsedLine}
      </div>
    )
  })
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("buzo-chat-history");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [INITIAL_MESSAGE];
  });
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("buzo-chat-history", JSON.stringify(messages))
    }
  }, [messages])

  const handleClearHistory = () => {
    localStorage.removeItem("buzo-chat-history")
    setMessages([INITIAL_MESSAGE])
  }

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
      // Add an initial empty assistant message that we will stream into
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", toolData: null }
      ]);

      const token = useAuthStore.getState().token;
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: userMsg,
          history
        })
      });

      if (response.status === 401) {
        useAuthStore.getState().logout();
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "You need to be logged in to chat with me. Please log in first!" }
        ]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.substring(6).trim();
              if (dataStr === "[DONE]") break;

              try {
                const parsed = JSON.parse(dataStr);
                
                if (parsed.error) {
                    setMessages((prev) => [
                      ...prev.slice(0, -1),
                      { role: "assistant", content: `Error: ${parsed.error}` }
                    ]);
                } else if (parsed.tool) {
                    // Update the active message with tool data
                    setMessages((prev) => {
                        const newMsgs = [...prev];
                        newMsgs[newMsgs.length - 1] = {
                            ...newMsgs[newMsgs.length - 1],
                            toolData: parsed
                        };
                        return newMsgs;
                    });
                } else if (parsed.response) {
                    // Append text content
                    setMessages((prev) => {
                        const newMsgs = [...prev];
                        const last = newMsgs[newMsgs.length - 1];
                        newMsgs[newMsgs.length - 1] = {
                            ...last,
                            content: last.content + parsed.response
                        };
                        return newMsgs;
                    });
                }
              } catch {
                // ignore parse error for chunk
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error)
      setMessages((prev) => {
        // If the last message is an empty assistant message, replace it
        const newMsgs = [...prev];
        if (newMsgs[newMsgs.length - 1].role === "assistant" && !newMsgs[newMsgs.length - 1].content) {
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again in a moment." };
          return newMsgs;
        }
        return [
          ...prev,
          { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again in a moment." }
        ];
      });
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group">
          <button
            onClick={() => setIsOpen(true)}
            className="relative h-14 w-14 rounded-full shadow-2xl flex items-center justify-center text-primary-foreground transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-tr from-primary to-blue-500 shadow-primary/30 cursor-pointer"
            title="Ask Buzo AI Transit Assistant"
          >
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-background" />
            </span>
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[360px] sm:w-[420px] h-[550px] max-h-[calc(100vh-48px)] bg-card border border-border/80 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 px-5 flex items-center justify-between text-white bg-gradient-to-r from-primary via-blue-600 to-indigo-600 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-xs">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                  Buzo AI Assistant
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[11px] opacity-90 font-medium">Real-time Bus & Route Concierge</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl h-8 w-8 flex items-center justify-center transition-colors cursor-pointer"
                onClick={handleClearHistory}
                title="Clear conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl h-8 w-8 flex items-center justify-center transition-colors cursor-pointer"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.filter((msg) => msg.role === "user" || msg.content).map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div
                  className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm shadow-xs"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {renderFormattedContent(msg.content)}
                  
                  {/* Starter suggestions if only initial message is present */}
                  {idx === 0 && messages.length <= 1 && (
                    <div className="pt-3 mt-2 border-t border-border/50 flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">Quick questions:</span>
                      {[
                        "What buses are running to Airport?",
                        "Find buses leaving from Majestic",
                        "Check available seats on next trip"
                      ].map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setInput(prompt)}
                          className="text-xs bg-background hover:bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-xl transition-all text-left font-medium shadow-2xs"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Payment Button Injection */}
                  {msg.toolData?.tool === "bookSeat" && msg.toolData?.data?.tripId && !msg.toolData?.data?.error && (
                    <div className="mt-3">
                      <Button 
                        size="sm" 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
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

            {isLoading && (!messages.length || messages[messages.length - 1].role !== "assistant" || !messages[messages.length - 1].content) && (
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



