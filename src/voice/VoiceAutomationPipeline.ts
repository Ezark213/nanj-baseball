import { VoiceVoxClient } from './client/VoiceVoxClient.js';
import { PatternManager } from './patterns/PatternManager.js';
import { VoiceGenerator } from './generator/VoiceGenerator.js';
import { AudioFileManager } from './manager/AudioFileManager.js';
import { VoiceGenerationResult, VoiceGenerationOptions } from './types.js';
import * as path from 'path';

export interface PipelineConfig {
  voicevoxUrl?: string;
  voicevoxTimeout?: number;
  configPath?: string;
  audioOutputDir?: string;
  autoCleanup?: {
    enabled: boolean;
    maxAge?: number;
    maxFiles?: number;
    maxSize?: number;
    interval?: number;
  };
  defaultOptions?: VoiceGenerationOptions;
}

export interface PipelineResult {
  success: boolean;
  results: VoiceGenerationResult[];
  originalText: string;
  processingTime: number;
  error?: string;
}

export class VoiceAutomationPipeline {
  private client: VoiceVoxClient;
  private patternManager: PatternManager;
  private generator: VoiceGenerator;
  private fileManager: AudioFileManager;
  private config: PipelineConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: PipelineConfig = {}) {
    this.config = {
      voicevoxUrl: 'http://localhost:50021',
      voicevoxTimeout: 10000,
      audioOutputDir: path.join(process.cwd(), 'audio'),
      autoCleanup: {
        enabled: false,
        maxAge: 24 * 60 * 60 * 1000, // 24時間
        maxFiles: 1000,
        maxSize: 100 * 1024 * 1024, // 100MB
        interval: 60 * 60 * 1000 // 1時間
      },
      ...config
    };

    this.initialize();
  }

  /**
   * システム初期化
   */
  private initialize(): void {
    // VoiceVoxクライアント初期化
    this.client = new VoiceVoxClient(
      this.config.voicevoxUrl!,
      this.config.voicevoxTimeout!
    );

    // パターン管理初期化
    this.patternManager = new PatternManager(this.config.configPath);

    // 音声生成器初期化
    this.generator = new VoiceGenerator(
      this.client,
      this.patternManager,
      this.config.audioOutputDir!
    );

    // ファイル管理初期化
    this.fileManager = new AudioFileManager(this.config.audioOutputDir!);

    // 自動クリーンアップ設定
    if (this.config.autoCleanup?.enabled) {
      this.setupAutoCleanup();
    }

    console.log('音声自動化パイプライン初期化完了');
  }

  /**
   * 単一音声生成（メインインターフェース）
   */
  public async generateSingleVoice(
    text: string,
    options?: VoiceGenerationOptions
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.config.defaultOptions, ...options };

    try {
      console.log(`音声生成開始: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

      // 前処理
      const processedText = this.preprocessText(text);

      // 音声生成
      const result = await this.generator.generateSingle(processedText, mergedOptions);

      // ファイル管理に登録
      if (result.success) {
        this.fileManager.registerAudioFile(result, text);
      }

      const processingTime = Date.now() - startTime;
      console.log(`音声生成完了: ${processingTime}ms`);

      return {
        success: result.success,
        results: [result],
        originalText: text,
        processingTime,
        error: result.error
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('パイプライン実行エラー:', error);

      return {
        success: false,
        results: [],
        originalText: text,
        processingTime,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * 複数音声生成
   */
  public async generateMultipleVoices(
    text: string,
    patternCount: number = 3,
    options?: VoiceGenerationOptions
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.config.defaultOptions, ...options };

    try {
      console.log(`複数音声生成開始: ${patternCount}パターン`);

      // 前処理
      const processedText = this.preprocessText(text);

      // 複数音声生成
      const results = await this.generator.generateMultiple(
        processedText,
        patternCount,
        mergedOptions
      );

      // 成功したファイルを管理に登録
      results.forEach(result => {
        if (result.success) {
          this.fileManager.registerAudioFile(result, text);
        }
      });

      const processingTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      console.log(`複数音声生成完了: ${successCount}/${patternCount}成功, ${processingTime}ms`);

      return {
        success: successCount > 0,
        results,
        originalText: text,
        processingTime,
        error: results.find(r => !r.success)?.error
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('複数音声生成エラー:', error);

      return {
        success: false,
        results: [],
        originalText: text,
        processingTime,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * バッチ処理（複数のテキストを一括処理）
   */
  public async generateBatch(
    texts: string[],
    options?: {
      multiplePatterns?: boolean;
      patternCount?: number;
      concurrency?: number;
      generationOptions?: VoiceGenerationOptions;
    }
  ): Promise<PipelineResult[]> {
    const {
      multiplePatterns = false,
      patternCount = 3,
      concurrency = 3,
      generationOptions
    } = options || {};

    console.log(`バッチ処理開始: ${texts.length}件`);

    const results: PipelineResult[] = [];
    const chunks = this.chunkArray(texts, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(text => {
        return multiplePatterns 
          ? this.generateMultipleVoices(text, patternCount, generationOptions)
          : this.generateSingleVoice(text, generationOptions);
      });

      const chunkResults = await Promise.allSettled(promises);
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            results: [],
            originalText: chunk[index],
            processingTime: 0,
            error: result.reason?.message || 'バッチ処理エラー'
          });
        }
      });
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`バッチ処理完了: ${successCount}/${texts.length}成功`);

    return results;
  }

  /**
   * テキスト前処理
   */
  private preprocessText(text: string): string {
    // 改行・空白の正規化
    let processed = text.replace(/\s+/g, ' ').trim();
    
    // 特殊文字の変換
    processed = processed.replace(/&/g, 'と');
    processed = processed.replace(/@/g, 'アット');
    processed = processed.replace(/#/g, 'シャープ');
    
    // 英数字の読み上げ最適化
    processed = processed.replace(/(\d+)/g, (match) => {
      // 数字をひらがなに変換するロジック（簡易版）
      return match;
    });

    // 長すぎるテキストの分割検討
    if (processed.length > 200) {
      console.warn(`長いテキスト検出: ${processed.length}文字`);
    }

    return processed;
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
   * 自動クリーンアップ設定
   */
  private setupAutoCleanup(): void {
    const interval = this.config.autoCleanup!.interval!;
    
    this.cleanupInterval = setInterval(async () => {
      try {
        console.log('自動クリーンアップ実行中...');
        
        const result = await this.fileManager.autoCleanup({
          maxAge: this.config.autoCleanup!.maxAge,
          maxFiles: this.config.autoCleanup!.maxFiles,
          maxSize: this.config.autoCleanup!.maxSize
        });

        if (result.deletedCount > 0) {
          console.log(`自動クリーンアップ完了: ${result.deletedCount}ファイル削除`);
        }

        // VoiceGeneratorのキャッシュも定期的にクリア
        this.generator.clearCache();
        
      } catch (error) {
        console.error('自動クリーンアップエラー:', error);
      }
    }, interval);
  }

  /**
   * システム状態を取得
   */
  public async getSystemStatus(): Promise<{
    voicevox: any;
    patterns: any;
    audio: any;
    pipeline: any;
  }> {
    try {
      const [voicevoxStatus, audioStats] = await Promise.all([
        this.client.healthCheck(),
        Promise.resolve(this.fileManager.getStatistics())
      ]);

      return {
        voicevox: voicevoxStatus,
        patterns: {
          available: this.patternManager.getAvailablePatterns().length,
          config: this.patternManager.getConfig().selectionMode
        },
        audio: audioStats,
        pipeline: {
          config: this.config,
          uptime: process.uptime()
        }
      };
    } catch (error) {
      throw new Error(`システム状態取得エラー: ${error}`);
    }
  }

  /**
   * システム停止
   */
  public shutdown(): void {
    console.log('音声自動化パイプライン停止中...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // 最終クリーンアップ
    this.generator.clearCache();
    
    console.log('音声自動化パイプライン停止完了');
  }

  /**
   * 設定更新
   */
  public updateConfig(newConfig: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.voicevoxUrl) {
      this.client.setBaseUrl(newConfig.voicevoxUrl);
    }
    
    if (newConfig.voicevoxTimeout) {
      this.client.setTimeout(newConfig.voicevoxTimeout);
    }
    
    console.log('パイプライン設定更新完了');
  }

  /**
   * パターン管理へのアクセサ
   */
  public getPatternManager(): PatternManager {
    return this.patternManager;
  }

  /**
   * ファイル管理へのアクセサ
   */
  public getFileManager(): AudioFileManager {
    return this.fileManager;
  }

  /**
   * 音声生成器へのアクセサ
   */
  public getGenerator(): VoiceGenerator {
    return this.generator;
  }

  /**
   * VoiceVoxクライアントへのアクセサ
   */
  public getClient(): VoiceVoxClient {
    return this.client;
  }
}