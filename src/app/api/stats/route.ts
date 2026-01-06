import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Fetch all records (exclude deleted)
        const allRecords = await prisma.reviewCycle.findMany({
            where: { deletedAt: null }
        });

        const totalCount = allRecords.length;
        const unapprovedCount = allRecords.filter((r) => !r.approvedAt).length;
        const approvedCount = totalCount - unapprovedCount;

        // Calculate Average Review Time (overall)
        let totalReviewTimeMs = 0;
        let approvedItemsCount = 0;

        // Calculate by Method
        const methodStats: Record<string, { totalTime: number; count: number }> = {};

        allRecords.forEach((record) => {
            if (record.approvedAt && record.requestedAt) {
                const timeDiff = new Date(record.approvedAt).getTime() - new Date(record.requestedAt).getTime();
                totalReviewTimeMs += timeDiff;
                approvedItemsCount++;

                // Method Stats
                if (!methodStats[record.approvalMethod]) {
                    methodStats[record.approvalMethod] = { totalTime: 0, count: 0 };
                }
                methodStats[record.approvalMethod].totalTime += timeDiff;
                methodStats[record.approvalMethod].count++;
            }
        });

        const averageReviewTimeMs = approvedItemsCount > 0 ? totalReviewTimeMs / approvedItemsCount : 0;

        const averageByMethod = Object.entries(methodStats).map(([method, stats]) => ({
            method,
            averageTimeMs: stats.count > 0 ? stats.totalTime / stats.count : 0,
            count: stats.count,
        }));

        return NextResponse.json({
            totalCount,
            unapprovedCount,
            approvedCount,
            averageReviewTimeMs,
            averageByMethod,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
