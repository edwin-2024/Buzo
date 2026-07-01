import { UserRole } from "@buzo/db";

import { driverRepository } from "../repositories/driver.repository";
import { userRepository } from "../repositories/user.repository";
import { busRepository } from "../repositories/bus.repository";

import type {
    AssignBusInput,
    CreateDriverInput,
} from "../validation/driver.schema";

export class DriverService {
    async findAll() {
        return driverRepository.findAll();
    }

    async findById(id: string) {
        const driver = await driverRepository.findById(id);

        if (!driver) {
            throw new Error("Driver not found");
        }

        return driver;
    }

    async create(input: CreateDriverInput) {
        const user = await userRepository.findById(input.userId);

        if (!user) {
            throw new Error("User not found");
        }

        if (user.role !== UserRole.DRIVER) {
            throw new Error("User is not a driver");
        }

        const existingDriver = await driverRepository.findByUserId(
            input.userId
        );

        if (existingDriver) {
            throw new Error("Driver already exists");
        }

        return driverRepository.create({
            user: {
                connect: {
                    id: input.userId,
                },
            },
        });
    }

    async assignBus(
        driverId: string,
        input: AssignBusInput
    ) {
        const driver = await this.findById(driverId);

        const bus = await busRepository.findById(input.busId);

        if (!bus) {
            throw new Error("Bus not found");
        }

        const assigned =
            await driverRepository.findByAssignedBusId(
                input.busId
            );

        if (assigned && assigned.id !== driver.id) {
            throw new Error("Bus already assigned");
        }

        return driverRepository.assignBus(
            driverId,
            input.busId
        );
    }

    async delete(id: string) {
        await this.findById(id);

        return driverRepository.delete(id);
    }
}

export const driverService = new DriverService();