import { prisma } from "./src";
import bcrypt from "bcrypt";

async function main() {
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    await prisma.user.update({
        where: { email: "admin@buzo.com" },
        data: { password: hashedPassword }
    });
    
    console.log("Admin password reset to 'password123'");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
