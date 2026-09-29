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
        { error: "Provider address required." },
        { status: 400 }
      );
    }

    const cleanId = recordId.trim().replace(/\.enc$/i, "");
    let filePath = path.join(UPLOAD_DIR, `${cleanId}.json`);
    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(UPLOAD_DIR)) {
        const files = fs.readdirSync(UPLOAD_DIR);
        const match = files.find(
          (f) => f.toLowerCase() === `${cleanId.toLowerCase()}.json`
        );
        if (match) {
          filePath = path.join(UPLOAD_DIR, match);
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `Record ${cleanId.slice(0, 10)}... not found in storage.` },
        { status: 404 }
      );
    }

    const record = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const contractAddress =
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
      contractAddressData.contractAddress;

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Contract address not configured." },
        { status: 503 }
      );
    }

    // 1. Mandatory on-chain consent check on MST Blockchain
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
          error:
            "403 Forbidden: AI Clinical Assistant is cryptographically blocked. No valid on-chain consent found on MST Blockchain.",
        },
        { status: 403 }
      );
    }

    // 2. Decrypt record content
    const decryptedBuffer = decryptRecord(
      record.encryptedData,
      record.iv,
      record.authTag
    );
    const contentString = decryptedBuffer.toString("utf8");

    // 3. Clinical AI Summarization (Simulated / Extracted for demo reliability)
    const summary = {
      recordTitle: record.title,
      summaryType: "AI Clinical Brief (Gated by MST Blockchain Consent)",
      generatedAt: new Date().toISOString(),
      highlights: [
        "Patient exhibits stable vital signs with slight hypertensive deviation.",
        "Cholesterol panel shows elevated LDL (142 mg/dL); HDL within normal parameters (52 mg/dL).",
        "Recommended follow-up: Lifestyle modification and re-testing in 60 days.",
      ],
      suggestedMedications: [
        { name: "Atorvastatin", dosage: "10mg daily", note: "Pending lipid panel verification" },
      ],
      complianceNote: "Access authenticated via MST Blockchain contract verification.",
    };

    return NextResponse.json({
      success: true,
      summary,
      rawPreview: contentString.slice(0, 300) + (contentString.length > 300 ? "..." : ""),
    });
  } catch (error: any) {
    console.error("AI summary error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate clinical summary." },
      { status: 500 }
    );
  }
}
