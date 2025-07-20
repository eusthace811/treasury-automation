import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { createDocument } from './ai/tools/create-document';
import type { updateDocument } from './ai/tools/update-document';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { ruleParser } from './ai/tools/rule-parser';
import type { ruleEvaluator } from './ai/tools/rule-evaluator';
import type { ruleValidator } from './ai/tools/rule-validator';
import type { ruleUpdater } from './ai/tools/rule-updater';
import type { ruleAnswer } from './ai/tools/rule-answer';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type ruleParserTool = InferUITool<typeof ruleParser>;
type ruleEvaluatorTool = InferUITool<typeof ruleEvaluator>;
type ruleValidatorTool = InferUITool<typeof ruleValidator>;
type ruleUpdaterTool = InferUITool<typeof ruleUpdater>;
type ruleAnswerTool = InferUITool<typeof ruleAnswer>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  ruleParser: ruleParserTool;
  ruleEvaluator: ruleEvaluatorTool;
  ruleValidator: ruleValidatorTool;
  ruleUpdater: ruleUpdaterTool;
  ruleAnswer: ruleAnswerTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
