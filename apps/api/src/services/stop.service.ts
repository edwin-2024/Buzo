import { stopRepository } from "../repositories/stop.repository";

import {
    type CreateStopInput,
    type UpdateStopInput,
} from "../validation/stop.schema";

export class StopService {
    async findAll() {
        return stopRepository.findAll();
    }

    async findById(id: string) {
        const stop = await stopRepository.findById(id);

        if (!stop) {
            throw new Error("Stop not found");
        }

        return stop;
    }

    async create(input: CreateStopInput) {
        const existing = await stopRepository.findByName(input.name);

        if (existing) {
            throw new Error("Stop already exists");
        }

        return stopRepository.create(input);
    }

    async update(
        id: string,
        input: UpdateStopInput
    ) {
        const existingStop = await stopRepository.findByName(input.name);

        if (existingStop && existingStop.id !== id) {
            throw new Error("Stop already exists");
        }
        await this.findById(id);

        return stopRepository.update(id, input);
    }

    async delete(id: string) {
        await this.findById(id);

        return stopRepository.delete(id);
    }
}

export const stopService = new StopService();