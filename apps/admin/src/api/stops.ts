import { api } from "../lib/axios";

export const stopsApi = {
    getAll: async () => {
        const { data } = await api.get("/stops");
        return data;
    },
    create: async (stop: any) => {
        const { data } = await api.post("/stops", stop);
        return data;
    },
    update: async (id: string, stop: any) => {
        const { data } = await api.patch(`/stops/${id}`, stop);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/stops/${id}`);
        return data;
    },
};
