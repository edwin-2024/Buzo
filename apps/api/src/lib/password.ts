import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;


export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}


export async function verifyPassword(
    password: string,
    hashedPassword: string
): Promise<boolean> {
    if (!hashedPassword.startsWith("$2b$") && !hashedPassword.startsWith("$2a$")) {
        return password === hashedPassword;
    }
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch {
        return password === hashedPassword;
    }
}