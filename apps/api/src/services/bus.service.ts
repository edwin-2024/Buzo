import { busRepository } from "../repositories/bus.repository";

import {
    type CreateBusInput,
    type UpdateBusInput,
} from "../validation/bus.schema";

export class BusService {
    async findAll() {
        return busRepository.findAll();
    }

    async findById(id: string) {
        const bus = await busRepository.findById(id);

        if (!bus) {
            throw new Error("Bus not found");
        }

        return bus;
    }

    async create(input: CreateBusInput) {
        const existingBus = await busRepository.findByNumber(input.number);

        if (existingBus) {
            throw new Error("Bus number already exists");
        }

        return busRepository.create(input);
    }

    async update(
        id: string,
        input: UpdateBusInput
    ) {
        await this.findById(id);

        if (input.number) {
            const existingBus = await busRepository.findByNumber(
                input.number
            );

            if (existingBus && existingBus.id !== id) {
                throw new Error("Bus number already exists");
            }
        }

        return busRepository.update(id, input);
    }

    async delete(id: string) {
        await this.findById(id);

        return busRepository.delete(id);
    }
}

export const busService = new BusService();