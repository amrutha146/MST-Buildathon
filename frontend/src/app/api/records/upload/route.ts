import { NextRequest, NextResponse } from "next/server";
import { encryptRecord } from "@/lib/crypto";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "data", "records");

// Ensure upload storage directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const patientAddress = formData.get("patientAddress") as string | null;
    const title = (formData.get("title") as string) || "Medical Record";

    if (!file || !patientAddress) {
      return NextResponse.json(
        { error: "File and patient address are required." },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 1. Encrypt file using AES-256-GCM and derive SHA-256 integrity hash
    const { encryptedData, iv, authTag, fileHash } = encryptRecord(fileBuffer);

    // 2. Generate a unique recordId (bytes32 format)
    const randomHex = crypto.randomBytes(32).toString("hex");
    const recordId = "0x" + randomHex;

    // 3. Store encrypted blob off-chain (local disk storage representing secure medical bucket)
    const storagePointer = `enc-store://${recordId}.enc`;
    const payloadToStore = {
      recordId,
      title,
      fileName: file.name,
      fileType: file.type || "application/pdf",
      fileSize: fileBuffer.length,
      patientAddress: patientAddress.toLowerCase(),
      fileHash,
      storagePointer,
      iv,
      authTag,
      encryptedData,
      createdAt: new Date().toISOString(),
    };

    const filePath = path.join(UPLOAD_DIR, `${recordId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payloadToStore, null, 2));

    return NextResponse.json({
      success: true,
      recordId,
      fileHash,
      storagePointer,
      title,
      fileName: file.name,
      fileSize: fileBuffer.length,
      message: "File successfully encrypted with AES-256-GCM. Ready for MST Blockchain on-chain registration.",
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process and encrypt file." },
      { status: 500 }
    );
  }
}
