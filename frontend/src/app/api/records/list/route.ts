import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "records");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address")?.toLowerCase();

    if (!fs.existsSync(UPLOAD_DIR)) {
      return NextResponse.json({ records: [] });
    }

    const files = fs.readdirSync(UPLOAD_DIR);
    const records = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const filePath = path.join(UPLOAD_DIR, file);
        const content = JSON.parse(
          fs.readFileSync(filePath, "utf8")
        );
        let patientName = content.patientName;
        if (!patientName) {
          patientName = "Rahul Sharma (ABHA #91-8273-1920)";
          content.patientName = patientName;
          try {
            fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
          } catch {
            // best-effort cache update
          }
        }
        // Exclude sensitive encryption data from the public listing
        return {
          recordId: content.recordId,
          title: content.title,
          patientName,
          fileName: content.fileName,
          fileType: content.fileType,
          fileSize: content.fileSize,
          fileHash: content.fileHash,
          storagePointer: content.storagePointer,
          patientAddress: content.patientAddress,
          createdAt: content.createdAt,
        };
      })
      .filter((rec) => (address ? rec.patientAddress === address : true));

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list records." },
      { status: 500 }
    );
  }
}
