import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { codes } = body;

        if (!Array.isArray(codes) || codes.length === 0) {
            return NextResponse.json({ error: 'Invalid codes' }, { status: 400 });
        }

        const results = [];

        for (const code of codes) {
            // Find the LATEST record for this code that is NOT deleted
            const records = await prisma.reviewCycle.findMany({
                where: {
                    code,
                    deletedAt: null
                },
                orderBy: { requestedAt: 'desc' },
                take: 1
            });

            if (records.length === 0) {
                results.push({ code, status: 'not_found' });
            } else {
                const record = records[0];
                if (record.approvedAt) {
                    results.push({
                        code,
                        status: 'approved',
                        id: record.id,
                        address: record.address
                    });
                } else {
                    results.push({
                        code,
                        status: 'valid',
                        id: record.id,
                        address: record.address,
                        requestedAt: record.requestedAt
                    });
                }
            }
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error('Error checking bulk codes:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
