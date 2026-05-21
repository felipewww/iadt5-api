import { AnalysisState } from '@/infra/graph/analysis.state';
import { AnalysisSessionReadModel, AnalysisStatus } from '@/domain/read-models/analysis/analysis-session.read-model';

export function stateToReadModel(sessionId: string, state: AnalysisState): AnalysisSessionReadModel {
    const status: AnalysisStatus = state.evaluation
        ? 'completed'
        : state.pendingQuestions.length > 0
            ? 'awaiting_user'
            : 'analyzing';

    return {
        sessionId,
        status,
        filename: state.filename,
        pendingQuestions: state.pendingQuestions,
        evaluation: state.evaluation
            ? {
                score:           state.evaluation.score,
                summary:         state.evaluation.summary,
                strengths:       state.evaluation.strengths,
                weaknesses:      state.evaluation.weaknesses,
                recommendations: state.evaluation.recommendations,
              }
            : null,
    };
}
