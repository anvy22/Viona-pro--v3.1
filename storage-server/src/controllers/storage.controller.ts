import type { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { blobServiceClient, CONTAINER_NAME } from "../services/azure.service";
import type { UploadRequestBody } from "../types/interfaces";
import {
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

function getSharedKeyCredential(): StorageSharedKeyCredential {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING!;
  const accountNameMatch = connStr.match(/AccountName=([^;]+)/);
  const accountKeyMatch = connStr.match(/AccountKey=([^;]+)/);
  if (!accountNameMatch || !accountKeyMatch) {
    throw new Error("Cannot parse AccountName/AccountKey from AZURE_STORAGE_CONNECTION_STRING");
  }
  const accountName: string = accountNameMatch[1]!;
  const accountKey: string = accountKeyMatch[1]!;
  return new StorageSharedKeyCredential(accountName, accountKey);
}

function generateSasUrl(
  blobName: string,
  permissions: string,
  expiresInSeconds: number
): string {
  const credential = getSharedKeyCredential();
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING!;
  const accountNameMatch = connStr.match(/AccountName=([^;]+)/);
  const accountName = accountNameMatch![1];

  const expiresOn = new Date(Date.now() + expiresInSeconds * 1000);

  const sasPermissions = BlobSASPermissions.parse(permissions);

  const sasQueryParams = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: sasPermissions,
      expiresOn,
    },
    credential
  ).toString();

  return `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasQueryParams}`;
}

export async function upload(req: Request, res: Response) {
  try {
    const { name, type, size, mimeType, parentId } = req.body as UploadRequestBody;

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }

    const fileId = crypto.randomUUID();
    const blobName = `${req.user!.id}/${fileId}`;

    const file = await prisma.file.create({
      data: {
        id: fileId,
        name,
        type,
        size: BigInt(size || 0),
        mimeType,
        parentId: parentId || null,
        ownerId: req.user!.id,
        gcsKey: blobName,
      },
    });

    // Generate a SAS URL with Write permission (valid for 10 minutes)
    const uploadUrl = generateSasUrl(blobName, "cw", 600);

    return res.json({ uploadUrl, fileId: file.id });
  } catch (error) {
    console.error("Error creating upload URL:", error);
    return res.status(500).json({ error: "Failed to create upload URL" });
  }
}

export async function finalize(req: Request, res: Response) {
  try {
    // Azure SAS uploads are atomic — no finalization step needed
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error finalizing upload:", error);
    res.status(500).json({ error: "Failed to finalize upload" });
  }
}

export async function download(req: Request, res: Response) {
  try {
    const file = await prisma.file.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id },
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (!file.gcsKey) {
      return res.status(400).json({ error: "File has no storage key" });
    }

    // Generate a SAS URL with Read permission (valid for 10 minutes)
    const downloadUrl = generateSasUrl(file.gcsKey, "r", 600);

    res.json({ downloadUrl });
  } catch (error) {
    console.error("Error creating download URL:", error);
    res.status(500).json({ error: "Failed to create download URL" });
  }
}
