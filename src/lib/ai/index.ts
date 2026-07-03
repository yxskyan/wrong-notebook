import { AIService } from "./types";
import { GeminiProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";
import { AzureOpenAIProvider } from "./azure-provider";

export * from "./types";

import { getAppConfig, getActiveOpenAIConfig, getActiveCustomConfig } from "../config";
import { createLogger } from "../logger";

const logger = createLogger('ai');

export function getAIService(userId?: string): AIService {
    // Always get fresh config
    const config = getAppConfig();
    const provider = config.aiProvider;

    if (provider === "openai") {
        const activeConfig = getActiveOpenAIConfig();
        logger.info({ activeInstance: activeConfig?.name }, 'Using OpenAI Provider');
        return new OpenAIProvider({
            ...activeConfig,
            userId,
            providerName: 'openai'
        });
    } else if (provider === "azure") {
        logger.info({ deployment: config.azure?.deploymentName }, 'Using Azure OpenAI Provider');
        return new AzureOpenAIProvider({
            ...config.azure,
            userId,
            providerName: 'azure'
        });
    } else if (provider === "custom") {
        const activeConfig = getActiveCustomConfig();
        logger.info({ activeInstance: activeConfig?.name }, 'Using Custom AI Provider');
        return new OpenAIProvider({
            ...activeConfig,
            userId,
            providerName: 'custom'
        });
    } else {
        logger.info('Using Gemini Provider');
        return new GeminiProvider({
            ...config.gemini,
            userId,
            providerName: 'gemini'
        });
    }
}

