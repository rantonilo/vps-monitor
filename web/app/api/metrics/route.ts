import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
    const serverID = request.headers.get("X-Server-ID");
    const clientSignature = request.headers.get("X-Signature");

    if (!serverID || !clientSignature) {
        return NextResponse.json({ error: "Missing Headers" }, { status: 400 });
    }

    const server = await prisma.server.findUnique({
        where: { id: serverID }
    });

    if (!server) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Need to read body as text first to verify signature
    const bodyText = await request.text();

    // Verify HMAC
    const hmac = crypto.createHmac('sha256', server.secretKey);
    hmac.update(bodyText);
    const calculatedSignature = hmac.digest('hex');

    if (calculatedSignature !== clientSignature) {
        console.log("❌ Invalid Signature!");
        return NextResponse.json({ error: "Bad Signature" }, { status: 401 });
    }

    try {
        // Just validation that it is JSON
        JSON.parse(bodyText);

        await prisma.server.update({
            where: { id: serverID },
            data: {
                lastMetrics: bodyText, // Store raw JSON string
                lastSeen: new Date()
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Invalid JSON Body" }, { status: 400 });
    }
}

