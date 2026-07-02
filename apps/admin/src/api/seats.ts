import { api } from "../lib/axios";

export const seatsApi = {
    getByTrip: async (tripId: string) => {
        const { data } = await api.get(`/trips/${tripId}/seats`);
        return data;
    },
};
