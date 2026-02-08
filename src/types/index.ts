export interface StylePreset {
  id: string;
  name: string;
  description: string;
  prompt: string;
  thumbnail: string; // emoji for MVP
}

export interface GenerationRequest {
  imageBase64: string;
  styleId: string;
  customPrompt?: string;
}

export interface GenerationResponse {
  success: boolean;
  originalUrl?: string;
  cutoutUrl?: string;
  maskUrl?: string;
  resultUrl?: string;
  error?: string;
}

export type PipelineStep =
  | "uploading"
  | "removing-background"
  | "generating-scene"
  | "finalizing";

export interface PipelineStatus {
  step: PipelineStep;
  message: string;
}
