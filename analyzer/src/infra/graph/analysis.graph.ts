import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { END, START, StateGraph, Command, interrupt } from '@langchain/langgraph';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { MongoClient } from 'mongodb';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { LlmService } from '@/infra/llm/llm.service';
import { MONGO_CLIENT } from '@/infra/mongodb/mongodb.module';
import { config } from '@/infra/config';
import {
    AnalysisAnnotation,
    AnalysisState,
    ArchitectureJson,
    EvaluationResult,
} from './analysis.state';

const AnalysisOutputSchema = z.object({
    architecture_json: z.object({
        components: z.array(z.object({
            name: z.string(),
            type: z.string(),
            description: z.string(),
            responsibilities: z.array(z.string()),
        })).default([]),
        relationships: z.array(z.object({
            from: z.string(),
            to: z.string(),
            type: z.string(),
            description: z.string(),
        })).default([]),
        patterns: z.array(z.string()).default([]),
        technologies: z.array(z.string()).default([]),
    }),
    questions: z.array(z.string()).default([]),
});

const EvaluationSchema = z.object({
    score: z.number().min(0).max(10),
    summary: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    recommendations: z.array(z.string()),
});

const ANALYZE_PROMPT = `Você é um especialista em arquitetura de software.

Analise o diagrama/documento fornecido e SEMPRE retorne um JSON estruturado com os componentes, relacionamentos, padrões e tecnologias que conseguir identificar — mesmo que o mapeamento seja parcial ou incerto em alguns pontos.

Em "questions", liste APENAS dúvidas específicas sobre partes ambíguas ou ausentes que impactam a precisão do JSON. Se o mapeamento estiver completo e confiante, deixe "questions" vazio.

Quando o histórico de mensagens contiver respostas anteriores do usuário, use-as para corrigir e refinar o JSON já extraído.

Responda sempre em português.`;

const EVALUATE_PROMPT = `Você é um avaliador especialista em arquitetura de software.
Com base na estrutura JSON extraída, avalie a qualidade da arquitetura e forneça:
- Nota de 0 a 10
- Resumo executivo
- Pontos fortes
- Pontos fracos e riscos
- Recomendações concretas de melhoria

Responda sempre em português.`;

@Injectable()
export class AnalysisGraphService implements OnModuleInit {
    private compiledGraph: any;

    constructor(
        private readonly llmService: LlmService,
        @Inject(MONGO_CLIENT) private readonly mongoClient: MongoClient,
    ) {}

    onModuleInit(): void {
        this.compiledGraph = this.buildGraph();
    }

    private buildGraph() {
        const llmAnalysis   = this.llmService.model.withStructuredOutput(AnalysisOutputSchema);
        const llmEvaluation = this.llmService.model.withStructuredOutput(EvaluationSchema);

        const extractArchitecture = async (state: AnalysisState): Promise<Partial<AnalysisState>> => {
            const diagramMessage = new HumanMessage({ content: this.buildMultimodalContent(state) });
            const result = await llmAnalysis.invoke([
                new SystemMessage(ANALYZE_PROMPT),
                diagramMessage,
                ...state.messages,
            ]);

            const architectureJson = result.architecture_json as ArchitectureJson;

            if (result.questions.length > 0) {
                return {
                    architectureJson,
                    pendingQuestions: result.questions,
                    messages: [new AIMessage(result.questions.join('\n'))],
                };
            }

            return { architectureJson, pendingQuestions: [] };
        };

        const waitForHuman = async (state: AnalysisState): Promise<Partial<AnalysisState>> => {
            const answer = interrupt(state.pendingQuestions);
            return {
                messages: [new HumanMessage(String(answer))],
                pendingQuestions: [],
            };
        };

        const evaluateArchitecture = async (state: AnalysisState): Promise<Partial<AnalysisState>> => {
            const result = await llmEvaluation.invoke([
                new SystemMessage(EVALUATE_PROMPT),
                new HumanMessage(JSON.stringify(state.architectureJson, null, 2)),
            ]);

            return { evaluation: result as EvaluationResult };
        };

        const routeAfterExtraction = (state: AnalysisState): 'waitForHuman' | 'evaluateArchitecture' =>
            state.pendingQuestions.length > 0 ? 'waitForHuman' : 'evaluateArchitecture';

        return new StateGraph(AnalysisAnnotation)
            .addNode('extractArchitecture',  extractArchitecture)
            .addNode('waitForHuman',         waitForHuman)
            .addNode('evaluateArchitecture', evaluateArchitecture)
            .addEdge(START, 'extractArchitecture')
            .addConditionalEdges('extractArchitecture', routeAfterExtraction)
            .addEdge('waitForHuman', 'extractArchitecture')
            .addEdge('evaluateArchitecture', END)
            .compile({
                checkpointer: new MongoDBSaver({
                    client: this.mongoClient,
                    dbName: 'analyzer',
                }),
            });
    }

    private buildMultimodalContent(state: AnalysisState): any[] {
        const textBlock = {
            type: 'text' as const,
            text: `Texto extraído via OCR:\n\n${state.ocrText}`,
        };

        if (state.fileMimeType === 'application/pdf' && config.llm.provider === 'anthropic') {
            return [
                {
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: state.fileContentBase64 },
                },
                textBlock,
            ];
        }

        if (state.fileMimeType.startsWith('image/')) {
            return [
                {
                    type: 'image_url',
                    image_url: { url: `data:${state.fileMimeType};base64,${state.fileContentBase64}` },
                },
                textBlock,
            ];
        }

        return [textBlock];
    }

    async start(input: {
        sessionId: string;
        filename: string;
        fileContentBase64: string;
        fileMimeType: string;
        ocrText: string;
    }): Promise<AnalysisState> {
        return this.compiledGraph.invoke(input, {
            configurable: { thread_id: input.sessionId },
        });
    }

    async resume(sessionId: string, answer: string): Promise<AnalysisState> {
        return this.compiledGraph.invoke(
            new Command({ resume: answer }),
            { configurable: { thread_id: sessionId } },
        );
    }

    async getState(sessionId: string): Promise<AnalysisState | null> {
        const snapshot = await this.compiledGraph.getState({
            configurable: { thread_id: sessionId },
        });
        return snapshot?.values ?? null;
    }
}
