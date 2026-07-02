import { api } from "../lib/axios";

export const driversApi = {
    getAll: async () => {
        const { data } = await api.get("/drivers");
        return data;
    },
    create: async (driver: any) => {
        const { data } = await api.post("/drivers", driver);
        return data;
    },
    assignBus: async (id: string, busId: string) => {
        const { data } = await api.patch(`/drivers/${id}/assign-bus`, { busId });
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/drivers/${id}`);
        return data;
    },
};
