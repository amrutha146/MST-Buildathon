import { NextRequest, NextResponse } from "next/server";
import { decryptRecord } from "@/lib/crypto";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import contractAddressData from "@/lib/contractAddress.json";
import MedicalConsentABI from "@/lib/MedicalConsentABI.json";

const UPLOAD_DIR = path.join(process.cwd(), "data", "records");

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordId = params.id;
    const body = await req.json();
    const { providerAddress } = body;

    if (!providerAddress) {
      return NextResponse.json(
        { error: "Provider address is required to verify on-chain consent." },
        { status: 400 }
      );
    }

    const filePath = path.join(UPLOAD_DIR, `${recordId}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Medical record not found in storage." },
        { status: 404 }
      );
    }

    const record = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const contractAddress =
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
      contractAddressData.contractAddress;

    if (!contractAddress) {
      return NextResponse.json(
        { error: "MST Smart Contract not deployed yet." },
        { status: 503 }
      );
    }

    // 1. Query MST Blockchain live state for hasAccess()
    const rpcUrl =
      process.env.NEXT_PUBLIC_MST_RPC_URL ||
      "https://testnetrpc.mstblockchain.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(
      contractAddress,
      MedicalConsentABI,
      provider
    );

    const hasAccess = await contract.hasAccess(recordId, providerAddress);

    if (!hasAccess) {
      return NextResponse.json(
        {
          authorized: false,
          error:
            "403 Forbidden: No active, unexpired consent grant exists on MST Blockchain for this provider.",
        },
        { status: 403 }
      );
    }

    // 2. Access verified on-chain! Decrypt the file
    const decryptedBuffer = decryptRecord(
      record.encryptedData,
      record.iv,
      record.authTag
    );

    return NextResponse.json({
      authorized: true,
      success: true,
      recordId,
      title: record.title,
      fileName: record.fileName,
      fileType: record.fileType,
      fileHash: record.fileHash,
      dataBase64: decryptedBuffer.toString("base64"),
      message: "Decryption authorized via verified MST Blockchain consent.",
    });
  } catch (error: any) {
    console.error("Access verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify on-chain access." },
      { status: 500 }
    );
  }
}
