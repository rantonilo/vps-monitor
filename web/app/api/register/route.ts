import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function generateSecret() {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { hostname, username, ip, install_token } = body;

        if (!hostname || !username || !ip || !install_token) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Find user by install token
        const user = await prisma.user.findUnique({
            where: { installToken: install_token }
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid Install Token" }, { status: 403 });
        }

        const serverID = `server_${hostname}_${username}_${ip}`;
        const secretKey = generateSecret();

        // Upsert server (create or update if exists)
        await prisma.server.upsert({
            where: { id: serverID },
            update: {
                secretKey,
                hostname,
                username,
                ip,
                lastSeen: new Date(),
                ownerId: user.id
            },
            create: {
                id: serverID,
                secretKey,
                hostname,
                username,
                ip,
                lastSeen: new Date(),
                ownerId: user.id
            }
        });

        console.log(`📝 Registered new machine: ${hostname} (User: ${user.email})`);

        return NextResponse.json({
            server_id: serverID,
            secret_key: secretKey,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
