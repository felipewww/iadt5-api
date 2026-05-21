import { Annotation, MessagesAnnotation } from '@langchain/langgraph';

export interface ArchitectureComponent {
    name: string;
    type: string;
    description: string;
    responsibilities: string[];
}

export interface ArchitectureRelationship {
    from: string;
    to: string;
    type: string;
    description: string;
}

export interface ArchitectureJson {
    components: ArchitectureComponent[];
    relationships: ArchitectureRelationship[];
    patterns: string[];
    technologies: string[];
}

export interface EvaluationResult {
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
}

export const AnalysisAnnotation = Annotation.Root({
    ...MessagesAnnotation.spec,
    sessionId:         Annotation<string>({ reducer: (_, b) => b }),
    filename:          Annotation<string>({ reducer: (_, b) => b }),
    fileContentBase64: Annotation<string>({ reducer: (_, b) => b }),
    fileMimeType:      Annotation<string>({ reducer: (_, b) => b }),
    ocrText:           Annotation<string>({ reducer: (_, b) => b }),
    architectureJson:  Annotation<ArchitectureJson | null>({ reducer: (_, b) => b, default: () => null }),
    pendingQuestions:  Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
    evaluation:        Annotation<EvaluationResult | null>({ reducer: (_, b) => b, default: () => null }),
    iterationCount:    Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
});

export type AnalysisState = typeof AnalysisAnnotation.State;
