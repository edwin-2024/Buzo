import { authService } from "./src/services/auth.service";

async function main() {
    const res = await authService.login({ email: "admin@buzo.com", password: "password123" });
    const token = res.token;
    
    const busRes = await fetch("http://localhost:3000/api/buses", {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(busRes.status, await busRes.text());
}

main().catch(console.error);
