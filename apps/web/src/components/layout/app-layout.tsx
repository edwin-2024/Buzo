import { Outlet } from "react-router-dom"
import { Header } from "./header"
import { ChatbotWidget } from "@/components/chatbot/widget"

export function AppLayout() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <ChatbotWidget />
      <footer className="border-t py-6 md:py-0">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4">
          <p className="text-sm leading-loose text-muted-foreground text-center md:text-left">
            Built for seamless bus travel.
          </p>
        </div>
      </footer>
    </div>
  )
}
