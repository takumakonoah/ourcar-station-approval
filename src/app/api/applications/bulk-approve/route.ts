import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
        }

        const now = new Date();

        const result = await prisma.reviewCycle.updateMany({
            where: {
                id: { in: ids },
                approvedAt: null, // Only approve if not currently approved
                deletedAt: null   // Safety check
            },
            data: {
                approvedAt: now,
                approvalMethod: 'BULK'
            }
        });

        return NextResponse.json({ approvedCount: result.count });
    } catch (error) {
        console.error('Error executing bulk approval:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
