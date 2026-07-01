import { Router } from "express";

import { busLocationController } from "../controllers/bus-location.controller";

const router = Router();

router.get(
    "/:busId/location",
    busLocationController.get
);

router.patch(
    "/:busId/location",
    busLocationController.update
);

export default router;