import { api } from "../lib/axios";

export const routesApi = {
    getAll: async () => {
        const { data } = await api.get("/routes");
        return data;
    },
    create: async (route: any) => {
        const { data } = await api.post("/routes", route);
        return data;
    },
    update: async (id: string, route: any) => {
        const { data } = await api.patch(`/routes/${id}`, route);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/routes/${id}`);
        return data;
    },
};
