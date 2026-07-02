import { api } from "../lib/axios";

export const busesApi = {
    getAll: async () => {
        const { data } = await api.get("/buses");
        return data;
    },
    create: async (bus: any) => {
        const { data } = await api.post("/buses", bus);
        return data;
    },
    update: async (id: string, bus: any) => {
        const { data } = await api.patch(`/buses/${id}`, bus);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/buses/${id}`);
        return data;
    },
};
