import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import crypto from 'crypto';

export async function GET() {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { installToken: true }
    });

    return NextResponse.json({ token: user?.installToken });
}

export async function POST() {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const newToken = crypto.randomUUID();

    await prisma.user.update({
        where: { email: session.user.email },
        data: { installToken: newToken }
    });

    return NextResponse.json({ token: newToken });
}
