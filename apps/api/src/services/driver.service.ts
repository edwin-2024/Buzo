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
        const user = await userRepository.findByEmail(input.email);

        if (!user) {
            throw new Error("User not found with that email address");
        }

        const existingDriver = await driverRepository.findByUserId(
            user.id
        );

        if (existingDriver) {
            throw new Error("User is already a registered driver");
        }
        
        // Upgrade user to DRIVER role if they aren't already
        if (user.role !== UserRole.DRIVER) {
            await userRepository.updateRole(user.id, UserRole.DRIVER);
        }

        return driverRepository.create({
            user: {
                connect: {
                    id: user.id,
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