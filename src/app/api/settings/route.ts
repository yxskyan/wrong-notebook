import { NextResponse } from "next/server";
import { getAppConfig, updateAppConfig } from "@/lib/config";
import { internalError, unauthorized } from "@/lib/api-errors";
import { createLogger } from "@/lib/logger";
import { OpenAIInstance, CustomAIInstance } from "@/types/api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const logger = createLogger('api:settings');

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return unauthorized("Unauthorized");
    }

    const config = getAppConfig();
    
    // Create a safe copy of config to return to frontend
    const safeConfig = JSON.parse(JSON.stringify(config));
    
    // Mask keys
    if (safeConfig.openai?.instances) {
        safeConfig.openai.instances.forEach((instance: OpenAIInstance) => {
            if (instance.apiKey) instance.apiKey = '********';
        });
    }
    if (safeConfig.gemini?.apiKey) {
        safeConfig.gemini.apiKey = '********';
    }
    if (safeConfig.azure?.apiKey) {
        safeConfig.azure.apiKey = '********';
    }
    if (safeConfig.custom?.instances) {
        safeConfig.custom.instances.forEach((instance: CustomAIInstance) => {
            if (instance.apiKey) instance.apiKey = '********';
        });
    }

    return NextResponse.json(safeConfig);
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return unauthorized("Unauthorized");
        }

        const body = await req.json();
        const currentConfig = getAppConfig();

        // Don't save masked keys if they somehow get sent back (for Gemini)
        if (body.gemini?.apiKey === '********') {
            // 保留原有的 API Key
            body.gemini.apiKey = currentConfig.gemini?.apiKey;
        }

        // For OpenAI instances, preserve original keys for masked entries
        if (body.openai?.instances) {
            const currentInstances = currentConfig.openai?.instances || [];
            body.openai.instances = body.openai.instances.map((instance: OpenAIInstance) => {
                if (instance.apiKey === '********') {
                    // 查找原有实例并保留其 API Key
                    const originalInstance = currentInstances.find((i: OpenAIInstance) => i.id === instance.id);
                    return {
                        ...instance,
                        apiKey: originalInstance?.apiKey || '',
                    };
                }
                return instance;
            });
        }

        // For Azure, preserve original key if masked
        if (body.azure?.apiKey === '********') {
            body.azure.apiKey = currentConfig.azure?.apiKey;
        }

        // For Custom AI instances, preserve original keys for masked entries
        if (body.custom?.instances) {
            const currentInstances = currentConfig.custom?.instances || [];
            body.custom.instances = body.custom.instances.map((instance: CustomAIInstance) => {
                if (instance.apiKey === '********') {
                    const originalInstance = currentInstances.find((i: CustomAIInstance) => i.id === instance.id);
                    return {
                        ...instance,
                        apiKey: originalInstance?.apiKey || '',
                    };
                }
                return instance;
            });
        }

        const updatedConfig = updateAppConfig(body);

        // Mask keys before returning to client
        const safeResponse = JSON.parse(JSON.stringify(updatedConfig));
        if (safeResponse.openai?.instances) {
            safeResponse.openai.instances.forEach((instance: OpenAIInstance) => {
                if (instance.apiKey) instance.apiKey = '********';
            });
        }
        if (safeResponse.gemini?.apiKey) {
            safeResponse.gemini.apiKey = '********';
        }
        if (safeResponse.azure?.apiKey) {
            safeResponse.azure.apiKey = '********';
        }
        if (safeResponse.custom?.instances) {
            safeResponse.custom.instances.forEach((instance: CustomAIInstance) => {
                if (instance.apiKey) instance.apiKey = '********';
            });
        }

        return NextResponse.json(safeResponse);
    } catch (error) {
        logger.error({ error }, 'Failed to update settings');
        return internalError("Failed to update settings");
    }
}


