// 動画合成システムのメインエクスポート

export { VideoComposer } from './VideoComposer.js';

// 型定義のエクスポート  
export * from './types.js';

// 便利な関数
import { VideoComposer } from './VideoComposer.js';
import { VideoComposition, VideoCompositionResult } from './types.js';

/**
 * 簡易動画合成関数
 */
export async function quickComposeVideo(
  text: string,
  audioFile: string, 
  options?: {
    subtitleImage?: string;
    backgroundVideo?: string;
    outputPath?: string;
  }
): Promise<string | null> {
  const composer = new VideoComposer();
  
  try {
    const outputPath = options?.outputPath || 
      composer.generateOutputFilename(text, 'nanj', process.cwd());
      
    const composition: VideoComposition = {
      text,
      audioFile,
      subtitleImage: options?.subtitleImage,
      backgroundVideo: options?.backgroundVideo,
      outputPath
    };
    
    const result = await composer.composeVideo(composition);
    return result.success ? result.outputPath! : null;
  } catch (error) {
    console.error('簡易動画合成エラー:', error);
    return null;
  }
}

/**
 * システム状態確認
 */
export async function checkVideoSystemHealth(): Promise<boolean> {
  const composer = new VideoComposer();
  
  try {
    const status = await composer.checkSystem();
    return status.pythonAvailable && status.scriptExists && status.tempDirWritable;
  } catch (error) {
    return false;
  }
}