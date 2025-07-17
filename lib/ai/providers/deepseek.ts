import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { isTestEnvironment } from '../../constants';
import { deepseek as provider } from '@ai-sdk/deepseek';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from '../models.test';

export const deepseek = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': provider('deepseek-chat'),
        'chat-model-reasoning': wrapLanguageModel({
          model: provider('deepseek-reasoner'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': provider('deepseek-chat'),
        'artifact-model': provider('deepseek-chat'),
      },
    });
