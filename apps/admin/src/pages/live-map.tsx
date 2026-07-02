import { MapIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function LiveMapPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Live Fleet Map</h2>
      </div>

      <Card className="h-[600px] flex flex-col border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Real-time Tracking</CardTitle>
          <CardDescription>
            Live locations of all active buses. (Map visualization coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="h-full w-full rounded-md border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MapIcon className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Map Integration Pending</h3>
            <p className="mt-2 text-center max-w-md">
              The live map will integrate Leaflet.js or Mapbox to consume real-time 
              location data emitted by the Driver app via Socket.IO.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
