import { EvaluationReadModel } from './evaluation.read-model';

export type AnalysisStatus = 'analyzing' | 'awaiting_user' | 'completed';

export interface AnalysisSessionReadModel {
    sessionId: string;
    status: AnalysisStatus;
    filename: string;
    pendingQuestions: string[];
    evaluation: EvaluationReadModel | null;
}
