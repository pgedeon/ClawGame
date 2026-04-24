export interface AssetMetadata {
  id: string;
  projectId: string;
  name: string;
  type: "sprite" | "tileset" | "texture" | "icon" | "audio" | "background" | "effect";
  prompt?: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  status: "generated" | "uploaded" | "error";
  generationData?: {
    model: string;
    confidence: number;
    parameters?: Record<string, unknown>;
  };
  aiGeneration?: {
    model: string;
    style: string;
    prompt: string;
    duration: number;
    quality?: string;
  };
}