import { anthropic } from './anthropic';
import { deepseek } from './deepseek';
import { openai } from './openai';
import { xai } from './xai';

const providers = {
  anthropic,
  deepseek,
  openai,
  xai,
};

export const myProvider =
  providers[
    (process.env.API_KEY_PROVIDER as keyof typeof providers) || 'openai'
  ];
