import { api } from "../lib/axios";

export const authApi = {
    login: async (credentials: any) => {
        const { data } = await api.post("/auth/login", credentials);
        return data;
    },
    me: async () => {
        const { data } = await api.get("/auth/me");
        return data;
    },
};
