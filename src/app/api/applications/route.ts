import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST: Record a new application
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, address, approvalMethod, note } = body;

        // Validation
        if (!code || !/^\d{3}$/.test(code)) {
            return NextResponse.json(
                { error: 'Code must be exactly 3 digits' },
                { status: 400 }
            );
        }
        if (!address || !approvalMethod) {
            return NextResponse.json(
                { error: 'Address and Approval Method are required' },
                { status: 400 }
            );
        }

        // Auto-set requestedAt to now
        const newRecord = await prisma.reviewCycle.create({
            data: {
                code,
                address,
                approvalMethod,
                note,
                requestedAt: new Date(),
            },
        });

        return NextResponse.json(newRecord, { status: 201 });
    } catch (error) {
        console.error('Error recording application:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// GET: Search/List applications
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const status = searchParams.get('status'); // 'approved' | 'unapproved' | 'all'

    const where: any = {};

    if (code) {
        where.code = code;
    }

    if (status === 'unapproved') {
        where.approvedAt = null;
    } else if (status === 'approved') {
        where.approvedAt = { not: null };
    }

    try {
        const records = await prisma.reviewCycle.findMany({
            where: {
                ...where,
                deletedAt: null, // Exclude deleted records
            },
            orderBy: { requestedAt: 'desc' },
        });
        return NextResponse.json(records);
    } catch (error) {
        console.error('Error fetching applications:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
