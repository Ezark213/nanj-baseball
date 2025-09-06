import { VoiceAutomationPipeline, VoiceGenerationOptions, VoiceGenerationResult } from '../voice/VoiceAutomationPipeline.js';
import { SubtitleGenerator } from '../subtitle/SubtitleGenerator.js';
import { VideoComposer } from '../video/VideoComposer.js';
import { SubtitleGenerationOptions, SubtitleRenderResult } from '../subtitle/types.js';
import { VideoComposition, VideoCompositionResult, VideoSettings } from '../video/types.js';
import * as path from 'path';
import * as fs from 'fs';

export interface FullVideoGenerationOptions {
  // 音声生成オプション
  voiceOptions?: VoiceGenerationOptions;
  voicePattern?: string;
  multipleVoicePatterns?: boolean;
  voicePatternCount?: number;

  // 字幕生成オプション
  subtitleOptions?: SubtitleGenerationOptions;
  subtitlePreset?: string;
  
  // 動画合成オプション
  videoSettings?: VideoSettings;
  backgroundVideo?: string;
  backgroundVideos?: string[]; // ランダム選択用
  
  // 出力設定
  outputDir?: string;
  filenamePrefix?: string;
  
  // 処理設定
  cleanupTemp?: boolean;
  keepIntermediateFiles?: boolean;
}

export interface FullVideoResult {
  success: boolean;
  text: string;
  outputs: {
    audioFiles: string[];
    subtitleFiles: string[];
    videoFiles: string[];
  };
  processingTime: number;
  steps: {
    voiceGeneration?: VoiceGenerationResult[];
    subtitleGeneration?: SubtitleRenderResult[];
    videoComposition?: VideoCompositionResult[];
  };
  error?: string;
}

export class FullAutomationPipeline extends VoiceAutomationPipeline {
  private subtitleGenerator: SubtitleGenerator;
  private videoComposer: VideoComposer;
  private outputBaseDir: string;

  constructor(config?: {
    voiceConfig?: any;
    subtitleOutputDir?: string;
    videoConfig?: any;
    outputBaseDir?: string;
  }) {
    super(config?.voiceConfig);
    
    this.outputBaseDir = config?.outputBaseDir || path.join(process.cwd(), 'output');
    
    // 字幕生成器の初期化
    this.subtitleGenerator = new SubtitleGenerator(
      config?.subtitleOutputDir || path.join(this.outputBaseDir, 'subtitles')
    );
    
    // 動画合成器の初期化
    this.videoComposer = new VideoComposer({
      ...config?.videoConfig,
      tempDir: path.join(this.outputBaseDir, 'temp')
    });
    
    this.ensureOutputDirectories();
  }

  /**
   * 出力ディレクトリを確保
   */
  private ensureOutputDirectories(): void {
    const dirs = [
      this.outputBaseDir,
      path.join(this.outputBaseDir, 'audio'),
      path.join(this.outputBaseDir, 'subtitles'), 
      path.join(this.outputBaseDir, 'videos'),
      path.join(this.outputBaseDir, 'temp')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * フル動画生成（メインインターフェース）
   */
  public async generateFullVideo(
    text: string,
    options?: FullVideoGenerationOptions
  ): Promise<FullVideoResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🎬 フル動画生成開始: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
      
      const result: FullVideoResult = {
        success: false,
        text,
        outputs: {
          audioFiles: [],
          subtitleFiles: [],
          videoFiles: []
        },
        processingTime: 0,
        steps: {}
      };

      // Step 1: 音声生成
      console.log('🎤 Step 1: 音声生成中...');
      const voiceResults = await this.generateVoices(text, options);
      result.steps.voiceGeneration = voiceResults;
      result.outputs.audioFiles = voiceResults
        .filter(r => r.success && r.filePath)
        .map(r => r.filePath!);

      if (result.outputs.audioFiles.length === 0) {
        throw new Error('音声ファイルの生成に失敗しました');
      }

      // Step 2: 字幕生成
      console.log('📝 Step 2: 字幕生成中...');
      const subtitleResults = await this.generateSubtitles(
        text, 
        result.outputs.audioFiles,
        options
      );
      result.steps.subtitleGeneration = subtitleResults;
      result.outputs.subtitleFiles = subtitleResults
        .filter(r => r.success && r.outputPath)
        .map(r => r.outputPath!);

      // Step 3: 動画合成
      console.log('🎥 Step 3: 動画合成中...');
      const videoResults = await this.composeVideos(
        text,
        result.outputs.audioFiles,
        result.outputs.subtitleFiles,
        options
      );
      result.steps.videoComposition = videoResults;
      result.outputs.videoFiles = videoResults
        .filter(r => r.success && r.outputPath)
        .map(r => r.outputPath!);

      // 成功判定
      result.success = result.outputs.videoFiles.length > 0;
      result.processingTime = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ フル動画生成完了: ${result.outputs.videoFiles.length}ファイル (${result.processingTime}ms)`);
        
        // 中間ファイルのクリーンアップ
        if (options?.cleanupTemp !== false) {
          await this.cleanupTemporaryFiles(result, options?.keepIntermediateFiles);
        }
      } else {
        throw new Error('動画ファイルの生成に失敗しました');
      }

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ フル動画生成エラー:', error);

      return {
        success: false,
        text,
        outputs: { audioFiles: [], subtitleFiles: [], videoFiles: [] },
        processingTime,
        steps: {},
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * バッチでフル動画生成
   */
  public async generateBatchVideos(
    texts: string[],
    options?: FullVideoGenerationOptions & {
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<FullVideoResult[]> {
    console.log(`🎬 バッチフル動画生成開始: ${texts.length}件`);
    
    const concurrency = Math.min(options?.concurrency || 2, texts.length);
    const results: FullVideoResult[] = [];
    const chunks = this.chunkArray(texts, concurrency);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`バッチ処理 ${chunkIndex + 1}/${chunks.length}: ${chunk.length}件並列処理`);

      // 並列実行
      const chunkPromises = chunk.map(text => this.generateFullVideo(text, options));
      const chunkResults = await Promise.allSettled(chunkPromises);

      // 結果の整理
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            text: chunk[index],
            outputs: { audioFiles: [], subtitleFiles: [], videoFiles: [] },
            processingTime: 0,
            steps: {},
            error: result.reason?.message || 'バッチ処理エラー'
          });
        }
      });

      // 進捗報告
      if (options?.onProgress) {
        options.onProgress(results.length, texts.length);
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ バッチフル動画生成完了: ${successCount}/${texts.length}成功`);

    return results;
  }

  /**
   * 音声を生成
   */
  private async generateVoices(
    text: string, 
    options?: FullVideoGenerationOptions
  ): Promise<VoiceGenerationResult[]> {
    if (options?.multipleVoicePatterns) {
      // 複数パターンで生成
      const count = options.voicePatternCount || 3;
      const result = await this.generateMultipleVoices(text, count, options?.voiceOptions);
      return result.results;
    } else {
      // 単一パターンで生成
      const voiceOptions = options?.voicePattern ? 
        { ...options.voiceOptions, preferredPatterns: [options.voicePattern] } :
        options?.voiceOptions;
      
      const result = await this.generateSingleVoice(text, voiceOptions);
      return result.results;
    }
  }

  /**
   * 字幕を生成
   */
  private async generateSubtitles(
    text: string,
    audioFiles: string[],
    options?: FullVideoGenerationOptions
  ): Promise<SubtitleRenderResult[]> {
    const subtitleOptions = {
      ...options?.subtitleOptions,
      preset: options?.subtitlePreset,
      outputDir: path.join(this.outputBaseDir, 'subtitles')
    };

    return await this.subtitleGenerator.generateBatchSubtitles(
      Array(audioFiles.length).fill(text), // 同じテキストを音声ファイル数分
      audioFiles,
      subtitleOptions
    );
  }

  /**
   * 動画を合成
   */
  private async composeVideos(
    text: string,
    audioFiles: string[],
    subtitleFiles: string[],
    options?: FullVideoGenerationOptions
  ): Promise<VideoCompositionResult[]> {
    const compositions: VideoComposition[] = [];

    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      const subtitleFile = subtitleFiles[i] || undefined;
      
      // 背景動画の選択
      let backgroundVideo: string | undefined;
      if (options?.backgroundVideos && options.backgroundVideos.length > 0) {
        backgroundVideo = this.videoComposer.selectRandomBackground(options.backgroundVideos);
      } else if (options?.backgroundVideo) {
        backgroundVideo = options.backgroundVideo;
      }

      // 出力ファイル名の生成
      const outputFilename = this.generateVideoOutputPath(text, i, options);

      compositions.push({
        text,
        audioFile,
        subtitleImage: subtitleFile,
        backgroundVideo,
        outputPath: outputFilename,
        settings: options?.videoSettings
      });
    }

    return await this.videoComposer.composeBatchVideos(compositions);
  }

  /**
   * 動画出力パスを生成
   */
  private generateVideoOutputPath(
    text: string, 
    index: number, 
    options?: FullVideoGenerationOptions
  ): string {
    const outputDir = options?.outputDir || path.join(this.outputBaseDir, 'videos');
    const prefix = options?.filenamePrefix || 'nanj';
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const textHash = Buffer.from(text.substring(0, 20)).toString('base64')
      .replace(/[/+=]/g, '').substring(0, 8);
    const indexSuffix = index > 0 ? `_${index + 1}` : '';
    
    return path.join(outputDir, `${prefix}_${textHash}_${timestamp}${indexSuffix}.mp4`);
  }

  /**
   * 一時ファイルのクリーンアップ
   */
  private async cleanupTemporaryFiles(
    result: FullVideoResult, 
    keepIntermediateFiles?: boolean
  ): Promise<void> {
    if (keepIntermediateFiles) return;

    try {
      const filesToCleanup: string[] = [];
      
      // 中間ファイルのみ削除（最終動画ファイルは保持）
      if (!keepIntermediateFiles) {
        filesToCleanup.push(...result.outputs.audioFiles);
        filesToCleanup.push(...result.outputs.subtitleFiles);
      }

      for (const filePath of filesToCleanup) {
        try {
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(`🗑️ 中間ファイル削除: ${path.basename(filePath)}`);
          }
        } catch (error) {
          console.warn(`中間ファイル削除失敗: ${filePath}`, error);
        }
      }

      // 動画合成器の一時ファイルもクリーンアップ
      await this.videoComposer.cleanupTempFiles(1); // 1時間以上古いファイル

    } catch (error) {
      console.warn('クリーンアップエラー:', error);
    }
  }

  /**
   * システム状態を確認
   */
  public async checkFullSystemStatus(): Promise<{
    voice: any;
    subtitle: any;
    video: any;
    system: any;
  }> {
    const [voiceStatus, videoStatus] = await Promise.all([
      this.getSystemStatus(),
      this.videoComposer.checkSystem()
    ]);

    return {
      voice: voiceStatus,
      subtitle: this.subtitleGenerator.getStats(),
      video: videoStatus,
      system: {
        outputBaseDir: this.outputBaseDir,
        diskSpace: await this.checkDiskSpace()
      }
    };
  }

  /**
   * ディスク容量をチェック
   */
  private async checkDiskSpace(): Promise<{ free: string; total: string }> {
    try {
      const stats = await fs.promises.statfs ? 
        fs.promises.statfs(this.outputBaseDir) : 
        null;
        
      if (stats) {
        const free = (stats.bavail * stats.bsize / 1024 / 1024 / 1024).toFixed(2);
        const total = (stats.blocks * stats.bsize / 1024 / 1024 / 1024).toFixed(2);
        return { free: `${free} GB`, total: `${total} GB` };
      }
    } catch (error) {
      // statfs が利用できない環境では概算値
    }
    
    return { free: 'unknown', total: 'unknown' };
  }

  /**
   * 配列をチャンクに分割
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * パイプライン設定を更新
   */
  public updateFullConfig(config: {
    voice?: any;
    subtitle?: { outputDir?: string };
    video?: any;
    outputBaseDir?: string;
  }): void {
    if (config.voice) {
      this.updateConfig(config.voice);
    }
    
    if (config.subtitle?.outputDir) {
      this.subtitleGenerator.setOutputDir(config.subtitle.outputDir);
    }
    
    if (config.video) {
      this.videoComposer.updateConfig(config.video);
    }
    
    if (config.outputBaseDir) {
      this.outputBaseDir = config.outputBaseDir;
      this.ensureOutputDirectories();
    }
  }

  /**
   * パイプライン統計情報を取得
   */
  public getFullStats(): {
    voice: any;
    subtitle: any;
    video: any;
    outputBaseDir: string;
  } {
    return {
      voice: this.getGenerator().getStats(),
      subtitle: this.subtitleGenerator.getStats(),
      video: this.videoComposer.getStats(),
      outputBaseDir: this.outputBaseDir
    };
  }

  /**
   * システム終了時のクリーンアップ
   */
  public async shutdownFull(): Promise<void> {
    console.log('🔄 フルオートメーションパイプライン終了処理中...');
    
    // 親クラスのshutdown
    this.shutdown();
    
    // 一時ファイルの最終クリーンアップ
    await this.videoComposer.cleanupTempFiles(0); // すべての一時ファイルを削除
    
    console.log('✅ フルオートメーションパイプライン終了完了');
  }
}