import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger('api:usage:stats');

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        // Aggregate system-wide total cost and tokens across ALL users
        const aggregate = await prisma.tokenUsage.aggregate({
            _sum: {
                totalTokens: true,
                cost: true,
            }
        });

        const totalTokens = aggregate._sum.totalTokens || 0;
        const totalCost = aggregate._sum.cost || 0;

        // Group by provider and model
        const grouped = await prisma.tokenUsage.groupBy({
            by: ['provider', 'model'],
            _sum: {
                totalTokens: true,
                cost: true,
            }
        });

        const modelUsage: Record<string, { tokens: number; cost: number }> = {};
        for (const item of grouped) {
            const key = `${item.provider}:${item.model}`;
            modelUsage[key] = {
                tokens: item._sum.totalTokens || 0,
                cost: item._sum.cost || 0,
            };
        }

        return NextResponse.json({
            systemTotalTokens: totalTokens,
            systemTotalCost: totalCost,
            modelUsage,
        });
    } catch (error) {
        logger.error({ error }, 'Failed to fetch usage stats');
        return NextResponse.json({ message: "Failed to fetch usage stats" }, { status: 500 });
    }
}
