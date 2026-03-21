import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import type { FileUpdateData, AuthenticatedRequest } from "../types/interfaces";
import { blobServiceClient, CONTAINER_NAME } from "../services/azure.service";

// ─── Helper 1: global "organizations" root folder ────────────────────────────
async function getOrEnsureRootOrgFolder(): Promise<{ id: string }> {
  let root = await prisma.file.findFirst({
    where: {
      name: "organizations",
      parentId: null,
      isOrgFolder: false,
      isTrashed: false,
    },
  });

  if (!root) {
    root = await prisma.file.create({
      data: {
        name: "organizations",
        type: "folder",
        ownerId: "system", // FK: must exist in storage_users (see Pre-Flight)
      },
    });
  }
  return root;
}

// ─── Helper 2: per-org subfolder inside "organizations/" ─────────────────────
async function getOrEnsureOrgFolder(
  orgId: string,
  orgName: string,
  rootFolderId: string,
): Promise<{ id: string }> {
  let orgFolder = await prisma.file.findFirst({
    where: {
      orgId,
      isOrgFolder: true,
      parentId: rootFolderId,
      isTrashed: false,
    },
  });

  if (!orgFolder) {
    orgFolder = await prisma.file.create({
      data: {
        name: orgName,
        type: "folder",
        isOrgFolder: true,
        orgId,
        parentId: rootFolderId,
        ownerId: "system",
      },
    });
  }
  return orgFolder;
}

export async function ensureOrgFolder(req: Request, res: Response) {
  try {
    const { orgId, orgName } = req.body;
    if (!orgId || !orgName) {
      return res.status(400).json({ error: "orgId and orgName are required" });
    }

    const root = await getOrEnsureRootOrgFolder();
    const orgFolder = await getOrEnsureOrgFolder(
      String(orgId),
      orgName,
      root.id,
    );

    res.json({
      rootFolderId: root.id, // id of the "organizations" folder
      orgFolderId: orgFolder.id, // id of the "Acme Corp" folder
    });
  } catch (error) {
    console.error("Error ensuring org folder:", error);
    res.status(500).json({ error: "Failed to ensure org folder" });
  }
}

export async function list(req: Request, res: Response) {
  try {
    const isTrashed = req.query.trashed === "true";
    const parentId = (req.query.parentId as string) || null;
    const search = (req.query.search as string) || null;
    const orgIds = ((req.query.orgIds as string) || "")
      .split(",")
      .filter(Boolean);

    // When searching, drop the parentId constraint so we search across all folders.
    // Otherwise scope to the current folder level.
    const parentFilter = search ? {} : isTrashed ? {} : { parentId };
    const nameFilter = search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {};

    // Personal files: exclude isOrgFolder rows so they don't show up twice
    const personalFiles = await prisma.file.findMany({
      where: {
        ownerId: req.user!.id,
        isOrgFolder: { not: true },
        orgId: null, // never show org-owned files under personal view
        ...parentFilter,
        ...nameFilter,
        isTrashed,
      },
    });

    let orgFiles: typeof personalFiles = [];

    if (orgIds.length > 0) {
      orgFiles = await prisma.file.findMany({
        where: {
          OR: [
            // Show the global "organizations/" root only when browsing (not trash, not search)
            ...(!search && !isTrashed
              ? [
                  {
                    name: "organizations",
                    parentId: null,
                    isOrgFolder: false,
                    isTrashed: false,
                  },
                ]
              : []),
            // Org files/folders — match the requested trash state
            {
              orgId: { in: orgIds },
              isTrashed, // true in trash view, false in browse view
              ...(search
                ? { name: { contains: search, mode: "insensitive" as const } }
                : isTrashed
                  ? {} // no parentId constraint in trash view — show all trashed org files
                  : { parentId }),
            },
          ],
        },
      });
    }

    res.json([...personalFiles, ...orgFiles]);
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

    // Inherit orgId from parent folder so org membership propagates to
    // sub-folders and any files subsequently uploaded into them.
    let orgId: string | null = null;
    if (parentId) {
      const parent = await prisma.file.findUnique({
        where: { id: parentId },
        select: { orgId: true },
      });
      if (parent?.orgId) orgId = parent.orgId;
    }

    const folder = await prisma.file.create({
      data: {
        name,
        type: "folder",
        parentId: parentId || null,
        ownerId: req.user!.id,
        ...(orgId ? { orgId } : {}),
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
    const userOrgIds = ((req.query.orgIds as string) || "")
      .split(",")
      .filter(Boolean);

    const existingFile = await prisma.file.findFirst({
      where: {
        id,
        OR: [
          { ownerId: req.user!.id },
          ...(userOrgIds.length > 0 ? [{ orgId: { in: userOrgIds } }] : []),
        ],
      },
    });

    if (!existingFile) {
      return res.status(404).json({ error: "File not found" });
    }

    const data: FileUpdateData = { ...req.body };

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

// ─── FIXED: org children are found by orgId, not only ownerId ─────────────────
async function deleteRecursive(
  folderId: string,
  ownerId: string,
  orgId?: string | null,
) {
  const children = await prisma.file.findMany({
    where: {
      parentId: folderId,
      OR: [{ ownerId }, ...(orgId ? [{ orgId }] : [])],
    },
  });

  for (const child of children) {
    if (child.type === "folder") {
      await deleteRecursive(child.id, ownerId, child.orgId);
    } else {
      if (child.gcsKey) {
        const containerClient =
          blobServiceClient.getContainerClient(CONTAINER_NAME);
        await containerClient.getBlockBlobClient(child.gcsKey).deleteIfExists();
      }
    }
    await prisma.file.delete({ where: { id: child.id } });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const userOrgIds = ((req.query.orgIds as string) || "")
      .split(",")
      .filter(Boolean);

    const file = await prisma.file.findFirst({
      where: {
        id: req.params.id,
        OR: [{ ownerId: req.user!.id }, { orgId: { in: userOrgIds } }],
      },
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.type === "folder") {
      await deleteRecursive(file.id, req.user!.id, file.orgId ?? null);
    } else {
      if (file.gcsKey) {
        const containerClient =
          blobServiceClient.getContainerClient(CONTAINER_NAME);
        await containerClient.getBlockBlobClient(file.gcsKey).deleteIfExists();
      }
    }

    await prisma.file.delete({ where: { id: file.id } });
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
}

export async function usage(req: Request, res: Response) {
  try {
    const result = await prisma.file.aggregate({
      where: {
        ownerId: req.user!.id,
        isTrashed: false,
        type: { not: "folder" },
      },
      _sum: { size: true },
    });

    const usedBytes = Number(result._sum.size ?? 0);
    const limitBytes = 500 * 1024 * 1024; // 500 MB
    const percentage = Math.min((usedBytes / limitBytes) * 100, 100);

    res.json({ usedBytes, limitBytes, percentage });
  } catch (error) {
    console.error("Error calculating usage:", error);
    res.status(500).json({ error: "Failed to get usage" });
  }
}

export async function copy(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { parentId } = req.body;

    const original = await prisma.file.findFirst({
      where: { id, ownerId: req.user!.id },
    });
    if (!original) return res.status(404).json({ error: "File not found" });

    if (original.type === "folder") {
      // Only copy the folder record (not recursive contents, for simplicity)
      const newFolder = await prisma.file.create({
        data: {
          name: `${original.name} (copy)`,
          type: "folder",
          parentId: parentId ?? null,
          ownerId: req.user!.id,
        },
      });
      return res.json(newFolder);
    }

    // For files: copy the Azure blob
    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);
    const newKey = `${req.user!.id}/${Date.now()}-${original.name}`;
    const sourceBlob = containerClient.getBlockBlobClient(original.gcsKey!);
    const destBlob = containerClient.getBlockBlobClient(newKey);
    await destBlob.beginCopyFromURL(sourceBlob.url);

    const newFile = await prisma.file.create({
      data: {
        name: `${original.name} (copy)`,
        type: original.type,
        size: original.size,
        mimeType: original.mimeType,
        gcsKey: newKey,
        parentId: parentId ?? null,
        ownerId: req.user!.id,
      },
    });
    res.json(newFile);
  } catch (error) {
    console.error("Error copying file:", error);
    res.status(500).json({ error: "Failed to copy file" });
  }
}
