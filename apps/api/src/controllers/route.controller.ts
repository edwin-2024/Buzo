import type { Request, Response, NextFunction } from "express";

import { routeService } from "../services/route.service";
import {
    createRouteSchema,
    updateRouteSchema,
} from "../validation/route.schema";

export class RouteController {
    getAll = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const routes = await routeService.findAll();

            res.status(200).json(routes);
        } catch (error) {
            next(error);
        }
    };

    getById = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const route = await routeService.findById(req.params.id);

            res.status(200).json(route);
        } catch (error) {
            next(error);
        }
    };

    create = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const input = createRouteSchema.parse(req.body);

            const route = await routeService.create(input);

            res.status(201).json(route);
        } catch (error) {
            next(error);
        }
    };

    update = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const input = updateRouteSchema.parse(req.body);

            const route = await routeService.update(
                req.params.id,
                input
            );

            res.status(200).json(route);
        } catch (error) {
            next(error);
        }
    };

    delete = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            await routeService.delete(req.params.id);

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export const routeController = new RouteController();