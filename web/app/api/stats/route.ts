import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    const session = await auth();

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch servers ensuring we check by owner email or ID
    // Since we set user.id in session callback, we can use it if available, or fetch by email
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { servers: true }
    });

    if (!user) return NextResponse.json([]);

    const servers = user.servers.map(s => ({
        hostname: s.hostname,
        username: s.username,
        ip: s.ip,
        server_id: s.id,
        lastMetrics: s.lastMetrics ? JSON.parse(s.lastMetrics) : null,
        lastSeen: s.lastSeen.getTime()
    }));

    return NextResponse.json(servers);
}
