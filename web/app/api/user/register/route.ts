import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const installToken = crypto.randomUUID();

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                installToken
            }
        });

        return NextResponse.json({ success: true, email: user.email });
    } catch (error) {
        return NextResponse.json({ error: "User already exists or error" }, { status: 400 });
    }
}
