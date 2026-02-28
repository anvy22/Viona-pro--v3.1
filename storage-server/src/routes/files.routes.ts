import { Router } from "express";
import { auth } from "../middleware/auth";
import * as c from "../controllers/files.controller";

const router = Router();
router.get("/", auth, c.list);
router.post("/folder", auth, c.createFolder);
router.patch("/:id", auth, c.update);
router.delete("/:id", auth, c.remove);

export default router;
