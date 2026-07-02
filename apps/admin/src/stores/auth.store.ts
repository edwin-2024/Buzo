import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
    id: string;
    name: string;
    email: string;
    role: "PASSENGER" | "DRIVER" | "ADMIN";
}

interface AuthState {
    user: User | null;
    token: string | null;
    login: (user: User, token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: (user, token) =>
                set({ user, token, isAuthenticated: true }),
            logout: () =>
                set({ user: null, token: null, isAuthenticated: false }),
        }),
        {
            name: "buzo-admin-auth",
        }
    )
);
