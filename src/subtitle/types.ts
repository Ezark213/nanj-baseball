// 字幕システム関連の型定義

export interface SubtitleConfig {
  text: string;
  startTime: number;      // 秒
  duration: number;       // 音声ファイルから自動計算
  style: SubtitleStyle;
  id?: string;           // 識別用ID
  outputPath?: string;   // 出力先パス
}

export interface SubtitleStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  position: 'top' | 'center' | 'bottom';
  maxWidth: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  padding?: number;
  margin?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
}

export interface NanjSubtitlePreset {
  id: string;
  name: string;
  description: string;
  style: SubtitleStyle;
  emotionTags: string[];  // 感情タグ（例: ['excited', 'happy']）
  useCase: string;        // 使用場面の説明
}

export interface SubtitleGenerationOptions {
  preset?: string;          // プリセットID
  customStyle?: Partial<SubtitleStyle>;
  outputDir?: string;
  filename?: string;
  format?: 'png' | 'jpg';
  quality?: number;        // 画質設定（1-100）
  maxLines?: number;       // 最大行数
  autoWrap?: boolean;      // 自動改行
  nanjMode?: boolean;      // なんJ語特殊処理
}

export interface SubtitleRenderResult {
  success: boolean;
  outputPath?: string;
  config: SubtitleConfig;
  dimensions?: {
    width: number;
    height: number;
  };
  lineCount?: number;
  error?: string;
  renderTime?: number;
}

export interface TextAnalysis {
  originalText: string;
  processedText: string;
  emotion?: 'happy' | 'excited' | 'sad' | 'angry' | 'neutral';
  nanjTerms: string[];     // 検出されたなんJ語
  estimatedReadingTime: number;  // 推定読み上げ時間（秒）
  complexity: 'simple' | 'medium' | 'complex';
  recommendedStyle?: string; // 推奨スタイル
}

export interface FontMetrics {
  width: number;
  height: number;
  baseline: number;
  descent: number;
}

// なんJ語特殊処理用の設定
export interface NanjProcessingConfig {
  termReplacements: Record<string, string>;  // 特殊文字の置換
  emotionKeywords: Record<string, string[]>; // 感情キーワード
  emphasizeTerms: string[];                  // 強調すべき語句
  colorMappings: Record<string, string>;     // 語句別色分け
}