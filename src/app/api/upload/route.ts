import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { createLogger } from "@/lib/logger";

const logger = createLogger('api:upload');

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        let { imageBase64, mimeType } = body;

        if (!imageBase64) {
            return NextResponse.json({ message: "Missing image data" }, { status: 400 });
        }

        // Parse Data URL if present
        if (imageBase64.startsWith('data:')) {
            const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1] || mimeType;
                imageBase64 = matches[2];
            }
        }

        const buffer = Buffer.from(imageBase64, 'base64');
        const extension = mimeType === 'application/pdf' ? 'pdf' : 'jpg'; // We only process to jpeg/pdf in frontend mostly
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const filename = `${randomUUID()}.${extension}`;
        const relativePath = `/uploads/${year}/${month}/${filename}`;
        
        // Ensure we save to public directory with year/month structure
        const publicDir = join(process.cwd(), 'public');
        const uploadDir = join(publicDir, 'uploads', year, month);
        const filepath = join(uploadDir, filename);

        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // ignore
        }

        await writeFile(filepath, buffer);
        logger.info({ filename, size: buffer.length }, 'File uploaded successfully');

        return NextResponse.json({ url: relativePath });
    } catch (error: any) {
        logger.error({ error: error.message }, 'Failed to upload file');
        return NextResponse.json({ message: "Upload failed" }, { status: 500 });
    }
}
