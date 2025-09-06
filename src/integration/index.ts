// 統合システムのメインエクスポート

export { FullAutomationPipeline } from './FullAutomationPipeline.js';

// 便利な関数
import { FullAutomationPipeline, FullVideoGenerationOptions } from './FullAutomationPipeline.js';

/**
 * デフォルト設定でフルオートメーションパイプラインを作成
 */
export function createFullAutomationPipeline(config?: {
  outputDir?: string;
  voiceConfig?: any;
  videoConfig?: any;
}): FullAutomationPipeline {
  return new FullAutomationPipeline({
    outputBaseDir: config?.outputDir,
    voiceConfig: config?.voiceConfig,
    videoConfig: config?.videoConfig
  });
}

/**
 * 簡易フル動画生成関数
 */
export async function quickGenerateFullVideo(
  text: string,
  options?: FullVideoGenerationOptions & {
    outputDir?: string;
  }
): Promise<string[]> {
  const pipeline = createFullAutomationPipeline({ 
    outputDir: options?.outputDir 
  });
  
  try {
    const result = await pipeline.generateFullVideo(text, options);
    return result.success ? result.outputs.videoFiles : [];
  } finally {
    await pipeline.shutdownFull();
  }
}

/**
 * システム全体の健康状態を確認
 */
export async function checkFullSystemHealth(): Promise<{
  overall: boolean;
  voice: boolean;
  video: boolean;
  issues: string[];
}> {
  const pipeline = createFullAutomationPipeline();
  
  try {
    const status = await pipeline.checkFullSystemStatus();
    
    const voiceHealthy = status.voice.voicevox.isConnected;
    const videoHealthy = status.video.pythonAvailable && status.video.scriptExists;
    const issues: string[] = [];
    
    if (!voiceHealthy) {
      issues.push('VoiceVox接続不可');
    }
    
    if (!videoHealthy) {
      issues.push('Python/動画システム不可');
      issues.push(...status.video.errors);
    }
    
    return {
      overall: voiceHealthy && videoHealthy,
      voice: voiceHealthy,
      video: videoHealthy,
      issues
    };
  } finally {
    await pipeline.shutdownFull();
  }
}