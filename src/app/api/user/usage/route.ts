import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:user:usage');

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        
        // 获取当月开始和结束时间
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // 获取当月总计
        const usageStats = await prisma.tokenUsage.aggregate({
            where: {
                userId,
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            _sum: {
                totalTokens: true,
                cost: true
            }
        });

        // 按提供商获取统计信息
        const providerStats = await prisma.tokenUsage.groupBy({
            by: ['provider'],
            where: {
                userId,
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            _sum: {
                totalTokens: true,
                cost: true
            }
        });

        return NextResponse.json({
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            totalTokens: usageStats._sum.totalTokens || 0,
            totalCost: usageStats._sum.cost || 0,
            providerStats: providerStats.map(stat => ({
                provider: stat.provider,
                tokens: stat._sum.totalTokens || 0,
                cost: stat._sum.cost || 0
            }))
        });

    } catch (error) {
        logger.error({ error }, '获取用量统计失败');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
