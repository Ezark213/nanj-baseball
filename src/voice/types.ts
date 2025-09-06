// 音声パターンの型定義
export interface VoicePattern {
  id: string;
  character: string;
  style: string;
  speakerId: number;
  description: string;
  enabled: boolean;
  priority?: number;
}

// 音声設定の型定義
export interface VoiceConfig {
  patterns: VoicePattern[];
  selectionMode: 'random' | 'rotation' | 'conditional' | 'priority';
  conditionalRules: ConditionalRules;
  defaultPattern: string;
  maxRetries: number;
  cacheDuration: number;
}

// 条件付き選択ルール
export interface ConditionalRules {
  timeRules: TimeRule[];
  emotionRules: EmotionRule[];
  contentRules: ContentRule[];
}

export interface TimeRule {
  timeRange: string; // "00:00-11:59", "12:00-17:59", "18:00-23:59"
  patternIds: string[];
}

export interface EmotionRule {
  emotion: 'happy' | 'sad' | 'excited' | 'angry' | 'neutral';
  keywords: string[];
  patternIds: string[];
}

export interface ContentRule {
  type: 'length' | 'contains' | 'startsWith' | 'endsWith';
  condition: string | number;
  patternIds: string[];
}

// VoiceVox API関連の型
export interface Speaker {
  name: string;
  speaker_uuid: string;
  styles: Style[];
  version?: string;
}

export interface Style {
  name: string;
  id: number;
}

export interface AudioQuery {
  accent_phrases: AccentPhrase[];
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  kana?: string;
}

export interface AccentPhrase {
  moras: Mora[];
  accent: number;
  pause_mora?: Mora;
  is_interrogative?: boolean;
}

export interface Mora {
  text: string;
  consonant?: string;
  consonant_length?: number;
  vowel: string;
  vowel_length: number;
  pitch: number;
}

// 音声生成結果
export interface VoiceGenerationResult {
  success: boolean;
  filePath?: string;
  pattern: VoicePattern;
  error?: string;
  duration?: number;
}

// 音声生成オプション
export interface VoiceGenerationOptions {
  patterns?: string[]; // 使用するパターンIDの配列
  outputDir?: string;
  filename?: string;
  format?: 'wav' | 'mp3';
  speedScale?: number;
  pitchScale?: number;
  volumeScale?: number;
}