import app from "./app";

import { env } from "@buzo/env";

app.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
});