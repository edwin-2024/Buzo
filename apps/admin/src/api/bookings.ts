import { api } from "../lib/axios";

export const bookingsApi = {
    getAll: async () => {
        const { data } = await api.get("/bookings");
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/bookings/${id}`);
        return data;
    },
};
