import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import type { FileUpdateData, AuthenticatedRequest } from "../types/interfaces";
import { blobServiceClient, CONTAINER_NAME } from "../services/azure.service";

export async function list(req: Request, res: Response) {
  try {
    const parentId = (req.query.parentId as string) || null;
    const files = await prisma.file.findMany({
      where: {
        ownerId: req.user!.id,
        parentId,
        isTrashed: req.query.trashed === "true",
      },
    });

    res.json(files);
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ error: "Failed to list files" });
  }
}

export async function createFolder(req: Request, res: Response) {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    const folder = await prisma.file.create({
      data: {
        name,
        type: "folder",
        parentId: parentId || null, // ensure empty string becomes null
        ownerId: req.user!.id,
      },
    });

    res.json(folder);
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ error: "Failed to create folder" });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // SECURITY FIX: Verify ownership before updating
    const existingFile = await prisma.file.findFirst({
      where: { id, ownerId: req.user!.id },
    });

    if (!existingFile) {
      return res.status(404).json({ error: "File not found" });
    }

    const data: FileUpdateData = { ...req.body };

    // Handle trash state
    if (data.isTrashed === true) {
      data.trashedAt = new Date();
    } else if (data.isTrashed === false) {
      data.trashedAt = null;
    }

    const file = await prisma.file.update({
      where: { id },
      data,
    });

    res.json(file);
  } catch (error) {
    console.error("Error updating file:", error);
    res.status(500).json({ error: "Failed to update file" });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id },
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.gcsKey) {
      const containerClient =
        blobServiceClient.getContainerClient(CONTAINER_NAME);
      await containerClient.getBlockBlobClient(file.gcsKey).deleteIfExists();
    }

    await prisma.file.delete({ where: { id: file.id } });
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
}
