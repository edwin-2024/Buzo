import { Router } from "express";

import { driverController } from "../controllers/driver.controller";

const router = Router();

router.get("/", driverController.getAll);
router.get("/:id", driverController.getById);

router.post("/", driverController.create);

router.patch(
    "/:id/assign-bus",
    driverController.assignBus
);

router.delete("/:id", driverController.delete);

export default router;