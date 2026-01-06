import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { codes, address, approvalMethod, note } = body;

        if (!Array.isArray(codes) || codes.length === 0) {
            return NextResponse.json({ error: 'Invalid codes' }, { status: 400 });
        }
        if (!address || !approvalMethod) {
            return NextResponse.json({ error: 'Address and Method required' }, { status: 400 });
        }

        const created = [];
        const skipped = []; // For codes that might already exist and are active? 
        // Requirement is looser, but let's assume we create them all. 
        // Or check if there's an active (unapproved) cycle for that code?
        // Let's create all for now to allow multiple requests for same code historically.

        for (const code of codes) {
            if (!/^\d{3}$/.test(code)) {
                skipped.push({ code, reason: 'Invalid format' });
                continue;
            }

            await prisma.reviewCycle.create({
                data: {
                    code,
                    address,
                    approvalMethod,
                    note,
                    requestedAt: new Date(),
                }
            });
            created.push(code);
        }

        return NextResponse.json({
            success: true,
            createdCount: created.length,
            skippedCount: skipped.length,
            created,
            skipped
        }, { status: 201 });

    } catch (error) {
        console.error('Error batch creating applications:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
