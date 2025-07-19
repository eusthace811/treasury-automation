export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}