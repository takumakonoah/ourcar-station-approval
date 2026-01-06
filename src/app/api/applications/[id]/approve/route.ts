import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Fetch the original record to validate
        const record = await prisma.reviewCycle.findUnique({
            where: { id },
        });

        if (!record) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        if (record.approvedAt) {
            return NextResponse.json(
                { error: 'Application is already approved' },
                { status: 400 }
            );
        }

        const now = new Date();

        // Safety check: approvedAt cannot be before requestedAt (though unlikely with 'now')
        if (now < record.requestedAt) {
            return NextResponse.json(
                { error: 'Approval time cannot be before request time' },
                { status: 400 }
            );
        }

        const body = await request.json().catch(() => ({})); // Handle empty body safely
        const { method } = body;

        const dataToUpdate: any = {
            approvedAt: now,
        };

        if (method === 'BULK') {
            dataToUpdate.approvalMethod = 'BULK';
        }

        const updatedRecord = await prisma.reviewCycle.update({
            where: { id },
            data: dataToUpdate,
        });

        return NextResponse.json(updatedRecord);
    } catch (error) {
        console.error('Error approving application:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
