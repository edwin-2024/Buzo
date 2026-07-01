import http from "http";

import app from "./app";
import { env } from "@buzo/env";
import { initializeSocket } from "./realtime/socket";

const server = http.createServer(app);

initializeSocket(server);

server.listen(env.PORT, () => {
    console.log(`🚀 Server running on ${env.PORT}`);
});