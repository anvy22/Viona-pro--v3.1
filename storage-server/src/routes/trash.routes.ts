import { Router } from "express";
import { prisma } from "../utils/prisma";
import { auth } from "../middleware/auth";
import type { Request, Response } from "express";

const router = Router();

router.delete("/", auth, async (req: Request, res: Response) => {
  try {
    await prisma.file.deleteMany({
      where: { ownerId: req.user!.id, isTrashed: true },
    });
    res.sendStatus(204);
  } catch (error) {
    console.error("Error emptying trash:", error);
    res.status(500).json({ error: "Failed to empty trash" });
  }
});

export default router;
