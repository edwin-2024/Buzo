import axios from "axios";

export const api = axios.create({
    baseURL: "/api",
});

api.interceptors.request.use((config) => {
    const state = localStorage.getItem("auth-storage");
    if (state) {
        try {
            const { state: { token } } = JSON.parse(state);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            console.error(e);
        }
    }
    return config;
});
