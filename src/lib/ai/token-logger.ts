import { prisma } from "../prisma";
import { createLogger } from "../logger";

const logger = createLogger('ai:token-logger');

export interface TokenUsageData {
    userId?: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedPromptTokens?: number;
    rates?: {
        inputCacheHit?: number;
        inputCacheMiss?: number;
        output?: number;
    };
}

export async function logTokenUsage(data: TokenUsageData) {
    if (!data.userId) {
        logger.warn('Missing userId, token usage will not be recorded');
        return;
    }

    try {
        let cost = 0;
        
        if (data.rates) {
            const outputCost = (data.completionTokens / 1_000_000) * (data.rates.output || 0);
            
            const cachedTokens = data.cachedPromptTokens || 0;
            const uncachedTokens = data.promptTokens - cachedTokens;
            
            const inputCachedCost = (cachedTokens / 1_000_000) * (data.rates.inputCacheHit || 0);
            const inputUncachedCost = (uncachedTokens / 1_000_000) * (data.rates.inputCacheMiss || 0);
            
            cost = outputCost + inputCachedCost + inputUncachedCost;
        }

        await prisma.tokenUsage.create({
            data: {
                userId: data.userId,
                provider: data.provider,
                model: data.model,
                promptTokens: data.promptTokens,
                completionTokens: data.completionTokens,
                totalTokens: data.totalTokens,
                cost: cost,
            }
        });
        
        logger.info({ userId: data.userId, cost, provider: data.provider, model: data.model }, 'Token usage recorded successfully');
    } catch (error) {
        logger.error({ error, data }, 'Failed to record token usage');
    }
}
