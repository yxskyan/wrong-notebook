"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSession } from "next-auth/react";
import { User, Activity } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface UsageData {
    systemTotalTokens: number;
    systemTotalCost: number;
    modelUsage?: Record<string, { tokens: number; cost: number }>;
}

interface AppConfigData {
    aiProvider: string;
    openai?: { activeInstanceId?: string; instances?: any[] };
    azure?: { model?: string };
    custom?: { activeInstanceId?: string; instances?: any[] };
    gemini?: { model?: string };
}

export function UserWelcome() {
    const { t, language } = useLanguage();
    const { data: session } = useSession();
    const [mounted, setMounted] = useState(false);
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [modelUsage, setModelUsage] = useState<{tokens: number, cost: number} | null>(null);
    const [aiModel, setAiModel] = useState<string | null>(null);
    const [providerKey, setProviderKey] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        if (session?.user) {
            // Fetch usage stats
            fetch('/api/usage/stats')
                .then(res => res.json())
                .then(data => {
                    if (!data.error) {
                        setUsage(data);
                    }
                })
                .catch(console.error);
                
            // Fetch AI config
            fetch('/api/settings')
                .then(res => res.json())
                .then((data: AppConfigData) => {
                    let modelName = 'Unknown Model';
                    let provider = data.aiProvider || 'gemini';
                    let activeModelKey = '';

                    if (data.aiProvider === 'openai') {
                        const activeInstance = data.openai?.instances?.find(i => i.id === data.openai?.activeInstanceId);
                        modelName = activeInstance?.name || activeInstance?.model || 'OpenAI Model';
                        activeModelKey = activeInstance?.model || '';
                    } else if (data.aiProvider === 'azure') {
                        modelName = data.azure?.model || 'Azure OpenAI';
                        activeModelKey = data.azure?.model || '';
                    } else if (data.aiProvider === 'custom') {
                        const activeInstance = data.custom?.instances?.find(i => i.id === data.custom?.activeInstanceId);
                        modelName = activeInstance?.name || activeInstance?.model || 'Custom Model';
                        activeModelKey = activeInstance?.model || '';
                    } else {
                        modelName = data.gemini?.model || 'Gemini Model';
                        activeModelKey = data.gemini?.model || '';
                    }
                    
                    setAiModel(modelName);
                    if (provider && activeModelKey) {
                        setProviderKey(`${provider}:${activeModelKey}`);
                    }
                })
                .catch(console.error);
        }
    }, [session?.user]);

    useEffect(() => {
        if (usage && providerKey && usage.modelUsage) {
            const mUsage = usage.modelUsage[providerKey] || { tokens: 0, cost: 0 };
            setModelUsage(mUsage);
        }
    }, [usage, providerKey]);

    // Server always renders 'User' (no session). Client matches this initially.
    // After mount, we show the real name.
    const userName = mounted && session?.user ? (session.user.name || session.user.email) : 'User';

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <span className="font-medium">
                    {t.common.welcome || 'Welcome back, '}
                    {userName}
                </span>
            </div>
            
            
            {mounted && (usage || aiModel) && (
                <div className="flex items-center gap-x-4 gap-y-2 text-sm text-muted-foreground bg-muted/50 py-2 px-3 rounded-md flex-wrap w-full sm:w-auto mt-3 sm:mt-0">
                    {aiModel && (
                        <div className="flex items-center gap-1.5 sm:border-r sm:pr-4 border-border/50">
                            <Activity className="h-4 w-4 text-primary shrink-0" />
                            <span className="shrink-0">AI 模型:</span>
                            <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-none">{aiModel}</span>
                        </div>
                    )}
                    {modelUsage && (
                        <div className="flex items-center gap-2 sm:border-r sm:pr-4 border-border/50">
                            <span className="shrink-0">当前模型消耗:</span>
                            <div className="flex gap-2 font-medium shrink-0">
                                <span>{formatNumber(modelUsage.tokens)} Tokens</span>
                                <span className="text-primary">¥{modelUsage.cost.toFixed(4)}</span>
                            </div>
                        </div>
                    )}
                    {usage && (
                        <div className="flex items-center gap-2">
                            <span className="shrink-0">全系统总计:</span>
                            <div className="flex gap-2 font-medium shrink-0">
                                <span>{formatNumber(usage.systemTotalTokens)} Tokens</span>
                                <span className="text-primary">¥{usage.systemTotalCost.toFixed(4)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
