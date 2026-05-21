import { Injectable } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { config } from '@/infra/config';

@Injectable()
export class LlmService {
    private readonly _model: BaseChatModel;

    constructor() {
        this._model = this.createModel();
    }

    get model(): BaseChatModel {
        return this._model;
    }

    private createModel(): BaseChatModel {
        if (config.llm.provider === 'anthropic') {
            return new ChatAnthropic({
                model: config.llm.model,
                apiKey: config.llm.anthropicApiKey,
            });
        }
        return new ChatOpenAI({
            model: config.llm.model,
            apiKey: config.llm.openaiApiKey,
        }) as unknown as BaseChatModel;
    }
}
