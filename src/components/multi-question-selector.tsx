import React, { useState } from 'react';
import { ParsedQuestion } from '@/lib/ai/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { useLanguage } from '@/contexts/LanguageContext';
interface MultiQuestionSelectorProps {
    questions: ParsedQuestion[];
    onSaveSelected: (selectedIndices: number[]) => Promise<void>;
    onEdit: (index: number) => void;
    onCancel: () => void;
}

export function MultiQuestionSelector({ questions, onSaveSelected, onEdit, onCancel }: MultiQuestionSelectorProps) {
    const { t } = useLanguage();
    const [selectedIndices, setSelectedIndices] = useState<number[]>(questions.map((_, i) => i));
    const [isSaving, setIsSaving] = useState(false);

    const toggleSelection = (index: number) => {
        setSelectedIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSaveSelected(selectedIndices);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="w-full max-w-4xl mx-auto shadow-xl bg-white/90 backdrop-blur-sm border-white/50">
            <CardHeader>
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
                    已识别出 {questions.length} 道题目，请选择要保存的题目
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-4">
                    <Button variant="outline" size="sm" onClick={() => setSelectedIndices(questions.map((_, i) => i))}>
                        全选
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedIndices([])}>
                        取消全选
                    </Button>
                </div>
                <div className="h-[60vh] overflow-y-auto pr-4">
                    <div className="space-y-4">
                        {questions.map((q, index) => (
                            <Card key={index} className={`cursor-pointer transition-all duration-200 ${selectedIndices.includes(index) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-slate-50'}`}>
                                <CardContent className="p-4 flex gap-4">
                                    <div className="pt-1">
                                        <Checkbox
                                            checked={selectedIndices.includes(index)}
                                            onCheckedChange={() => toggleSelection(index)}
                                            id={`question-${index}`}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0" onClick={() => toggleSelection(index)}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="secondary">{q.subject || '其他'}</Badge>
                                            <span className="text-sm text-slate-500 font-medium">题目 {index + 1}</span>
                                        </div>
                                        <div className="text-sm prose prose-sm max-w-none line-clamp-3 mb-3">
                                            <MarkdownRenderer content={q.questionText} />
                                        </div>
                                        {q.knowledgePoints && q.knowledgePoints.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {q.knowledgePoints.map((kp, kpIndex) => (
                                                    <Badge key={kpIndex} variant="outline" className="text-xs">{kp}</Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col justify-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(index);
                                            }}
                                        >
                                            编辑
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4 bg-slate-50/50">
                <Button variant="outline" onClick={onCancel}>
                    {t.common?.cancel || 'Cancel'}
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={selectedIndices.length === 0 || isSaving}
                    className="min-w-[120px]"
                >
                    {isSaving ? '保存中...' : `保存选中的题目 (${selectedIndices.length})`}
                </Button>
            </CardFooter>
        </Card>
    );
}
