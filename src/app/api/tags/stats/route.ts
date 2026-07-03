import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger('api:tags:stats');

export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


/**
 * GET /api/tags/stats
 * 获取标签使用频率统计
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const subjectId = searchParams.get('subjectId');

        // 获取当前用户的所有错题（可选按科目过滤）的知识点和关联标签
        const errorItems = await prisma.errorItem.findMany({
            where: {
                userId: session.user.id,
                ...(subjectId ? { subjectId } : {})
            },
            select: {
                knowledgePoints: true,
                tags: { select: { name: true } }
            },
        });

        // 统计标签使用频率
        const tagStats: Record<string, number> = {};

        errorItems.forEach((item) => {
            if (item.knowledgePoints) {
                try {
                    const tags = JSON.parse(item.knowledgePoints);
                    if (Array.isArray(tags)) {
                        tags.forEach((tag: string) => {
                            if (tag && typeof tag === 'string') {
                                tagStats[tag] = (tagStats[tag] || 0) + 1;
                            }
                        });
                    }
                } catch (e) {
                    logger.warn({ knowledgePoints: item.knowledgePoints }, 'Failed to parse knowledgePoints for item');
                }
            }
            if (item.tags && item.tags.length > 0) {
                item.tags.forEach((tag) => {
                    tagStats[tag.name] = (tagStats[tag.name] || 0) + 1;
                });
            }
        });

        // 转换为数组并按使用次数排序
        const sortedStats = Object.entries(tagStats)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);

        return NextResponse.json({
            stats: sortedStats,
            total: errorItems.length,
            uniqueTags: sortedStats.length,
        });
    } catch (error) {
        logger.error({ error }, 'Error getting tag stats');
        return NextResponse.json(
            { message: "Failed to get tag statistics" },
            { status: 500 }
        );
    }
}
