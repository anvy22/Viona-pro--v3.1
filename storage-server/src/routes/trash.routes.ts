import { Router } from "express";
import { prisma } from "../utils/prisma";
import { auth } from "../middleware/auth";
import type { Request, Response } from "express";
import { blobServiceClient, CONTAINER_NAME } from "../services/azure.service";

const router = Router();

router.delete("/", auth, async (req: Request, res: Response) => {
  try {
    const trashedFiles = await prisma.file.findMany({
      where: { ownerId: req.user!.id, isTrashed: true },
      select: { id: true, gcsKey: true },
    });

    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);
    await Promise.all(
      trashedFiles
        .filter((f) => f.gcsKey)
        .map((f) =>
          containerClient.getBlockBlobClient(f.gcsKey!).deleteIfExists(),
        ),
    );

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
