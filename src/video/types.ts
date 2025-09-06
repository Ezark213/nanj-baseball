// 動画合成システム関連の型定義

export interface VideoComposition {
  text: string;
  audioFile: string;
  subtitleImage?: string;
  backgroundVideo?: string;
  outputPath: string;
  duration?: number;
  settings?: VideoSettings;
}

export interface VideoSettings {
  video?: {
    fps?: number;
    resolution?: [number, number];
    codec?: string;
    bitrate?: string;
    audio_codec?: string;
  };
  subtitle?: {
    position?: 'top' | 'center' | 'bottom';
    margin?: number;
    fade_duration?: number;
  };
  background?: {
    loop?: boolean;
    volume?: number;
  };
}

export interface VideoCompositionResult {
  success: boolean;
  outputPath?: string;
  composition: VideoComposition;
  processingTime?: number;
  error?: string;
  videoInfo?: {
    duration: number;
    fileSize: number;
    resolution: [number, number];
    fps: number;
  };
}

export interface BatchVideoOptions {
  concurrency?: number;
  outputDir?: string;
  filenamePattern?: string;
  settings?: VideoSettings;
  backgroundVideos?: string[]; // 複数の背景動画からランダム選択
  onProgress?: (completed: number, total: number) => void;
}

export interface PythonExecutionResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  result?: any;
  error?: string;
  executionTime?: number;
}

export interface VideoInfo {
  type: 'video' | 'audio' | 'image';
  file_path: string;
  file_size: number;
  extension: string;
  duration?: number;
  fps?: number;
  resolution?: [number, number];
  has_audio?: boolean;
  channels?: number;
  mode?: string;
  format?: string;
}

export interface SystemResources {
  platform: string;
  python_version: string;
  cpu_count: number;
  memory_gb: number;
  disk_free_gb: number;
  load_average?: number[];
}

export interface VideoComposerConfig {
  pythonPath?: string;
  scriptPath?: string;
  tempDir?: string;
  maxConcurrency?: number;
  timeout?: number; // milliseconds
  defaultSettings?: VideoSettings;
}

export interface BackgroundVideoTemplate {
  id: string;
  name: string;
  path: string;
  duration: number;
  resolution: [number, number];
  tags: string[];
  description: string;
  thumbnail?: string;
}

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  settings: VideoSettings;
  backgroundVideo?: string;
  tags: string[];
  useCase: string;
}