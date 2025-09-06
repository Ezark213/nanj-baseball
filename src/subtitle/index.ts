// 字幕生成システムのメインエクスポート

export { SubtitleGenerator } from './SubtitleGenerator.js';
export { NanjTextProcessor } from './utils/text-processor.js';

// 型定義のエクスポート
export * from './types.js';

// 便利な関数
import { SubtitleGenerator } from './SubtitleGenerator.js';
import { SubtitleGenerationOptions, SubtitleRenderResult } from './types.js';

/**
 * 簡易字幕生成関数
 */
export async function quickGenerateSubtitle(
  text: string,
  audioFilePath: string,
  options?: SubtitleGenerationOptions
): Promise<string | null> {
  const generator = new SubtitleGenerator();
  
  try {
    const config = await generator.generateSubtitle(text, audioFilePath, options);
    const result = await generator.renderSubtitleImage(config);
    
    return result.success ? result.outputPath! : null;
  } catch (error) {
    console.error('簡易字幕生成エラー:', error);
    return null;
  }
}

/**
 * 利用可能なプリセット一覧を取得
 */
export function getAvailableSubtitlePresets(): Array<{ id: string; name: string; description: string }> {
  const generator = new SubtitleGenerator();
  return generator.getAvailablePresets().map(preset => ({
    id: preset.id,
    name: preset.name,
    description: preset.description
  }));
}