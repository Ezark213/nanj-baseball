// メインエクスポート
export { VoiceAutomationPipeline } from './VoiceAutomationPipeline.js';

// 個別コンポーネント
export { VoiceVoxClient } from './client/VoiceVoxClient.js';
export { PatternManager } from './patterns/PatternManager.js';
export { VoiceGenerator } from './generator/VoiceGenerator.js';
export { AudioFileManager } from './manager/AudioFileManager.js';

// 型定義
export * from './types.js';

// 便利な関数
import { VoiceAutomationPipeline, PipelineConfig } from './VoiceAutomationPipeline.js';

/**
 * デフォルト設定でパイプラインを作成
 */
export function createDefaultPipeline(config?: Partial<PipelineConfig>): VoiceAutomationPipeline {
  const defaultConfig: PipelineConfig = {
    voicevoxUrl: 'http://localhost:50021',
    voicevoxTimeout: 10000,
    autoCleanup: {
      enabled: true,
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      maxFiles: 500,
      maxSize: 50 * 1024 * 1024, // 50MB
      interval: 60 * 60 * 1000 // 1時間
    },
    defaultOptions: {
      speedScale: 1.0,
      pitchScale: 0.0,
      volumeScale: 1.0
    }
  };

  return new VoiceAutomationPipeline({ ...defaultConfig, ...config });
}

/**
 * 簡易音声生成関数
 */
export async function quickGenerate(
  text: string, 
  options?: { 
    patternId?: string;
    multiple?: boolean;
    count?: number;
  }
): Promise<string[]> {
  const pipeline = createDefaultPipeline();
  
  try {
    const result = options?.multiple 
      ? await pipeline.generateMultipleVoices(text, options.count || 3)
      : await pipeline.generateSingleVoice(text, {
          preferredPatterns: options?.patternId ? [options.patternId] : undefined
        });

    return result.results
      .filter(r => r.success && r.filePath)
      .map(r => r.filePath!);
  } finally {
    pipeline.shutdown();
  }
}

/**
 * システム状態確認
 */
export async function checkSystemHealth(): Promise<boolean> {
  const pipeline = createDefaultPipeline();
  
  try {
    const status = await pipeline.getSystemStatus();
    return status.voicevox.isConnected;
  } catch {
    return false;
  } finally {
    pipeline.shutdown();
  }
}