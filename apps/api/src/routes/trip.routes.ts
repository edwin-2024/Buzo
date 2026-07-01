import { Router } from "express";

import { tripController } from "../controllers/trip.controller";

const router = Router();

router.get("/", tripController.getAll);
router.get("/:id", tripController.getById);

router.post("/", tripController.create);

router.patch("/:id", tripController.update);

router.delete("/:id", tripController.delete);

export default router;