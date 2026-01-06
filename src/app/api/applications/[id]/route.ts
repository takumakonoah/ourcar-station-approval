import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const record = await prisma.reviewCycle.findUnique({
            where: { id },
        });

        if (!record) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        // Logical delete
        const updatedRecord = await prisma.reviewCycle.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        return NextResponse.json(updatedRecord);
    } catch (error) {
        console.error('Error deleting application:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { requestedAt, approvedAt } = body;

        const record = await prisma.reviewCycle.findUnique({
            where: { id },
        });

        if (!record) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        const data: any = {};
        if (requestedAt !== undefined) data.requestedAt = new Date(requestedAt);
        if (approvedAt !== undefined && approvedAt !== null) data.approvedAt = new Date(approvedAt);
        // Allow clearing approvedAt if strictly needed, but easier to just allow modifying existing dates.

        const updatedRecord = await prisma.reviewCycle.update({
            where: { id },
            data,
        });

        return NextResponse.json(updatedRecord);
    } catch (error) {
        console.error('Error updating application:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
