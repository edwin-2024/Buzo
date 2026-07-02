import { api } from "../lib/axios";

export const tripsApi = {
    getAll: async () => {
        const { data } = await api.get("/trips");
        return data;
    },
    create: async (trip: any) => {
        const { data } = await api.post("/trips", trip);
        return data;
    },
    update: async (id: string, trip: any) => {
        const { data } = await api.patch(`/trips/${id}`, trip);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/trips/${id}`);
        return data;
    },
};
