import { VoiceVoxClient } from '../client/VoiceVoxClient.js';
import { PatternManager } from '../patterns/PatternManager.js';
import { VoicePattern, VoiceGenerationResult, VoiceGenerationOptions } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export class VoiceGenerator {
  private client: VoiceVoxClient;
  private patternManager: PatternManager;
  private cacheMap: Map<string, { filePath: string; timestamp: number }>;
  private outputDir: string;

  constructor(
    client: VoiceVoxClient,
    patternManager: PatternManager,
    outputDir: string = path.join(process.cwd(), 'audio')
  ) {
    this.client = client;
    this.patternManager = patternManager;
    this.cacheMap = new Map();
    this.outputDir = outputDir;
    this.ensureOutputDirectory();
  }

  /**
   * 出力ディレクトリを確保
   */
  private ensureOutputDirectory(): void {
    try {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      // キャラクター別ディレクトリも作成
      const characters = ['zundamon', 'metan', 'temp'];
      characters.forEach(char => {
        const charDir = path.join(this.outputDir, char);
        if (!fs.existsSync(charDir)) {
          fs.mkdirSync(charDir, { recursive: true });
        }
      });
    } catch (error) {
      console.error('出力ディレクトリ作成エラー:', error);
    }
  }

  /**
   * 単一パターンで音声を生成
   */
  public async generateSingle(
    text: string,
    options?: VoiceGenerationOptions
  ): Promise<VoiceGenerationResult> {
    const startTime = Date.now();

    try {
      // パターン選択
      const pattern = this.selectPattern(text, options);
      
      // キャッシュチェック
      const cacheKey = this.generateCacheKey(text, pattern, options);
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        console.log(`キャッシュから音声を取得: ${pattern.id}`);
        return {
          success: true,
          filePath: cachedResult.filePath,
          pattern,
          duration: Date.now() - startTime
        };
      }

      // ファイルパス生成
      const filePath = this.generateFilePath(text, pattern, options);

      // 音声生成
      const audioBuffer = await this.client.generateSpeech(
        text,
        pattern.speakerId,
        {
          speedScale: options?.speedScale,
          pitchScale: options?.pitchScale,
          volumeScale: options?.volumeScale
        }
      );

      // ファイル保存
      await this.saveAudioFile(audioBuffer, filePath);

      // キャッシュに追加
      this.addToCache(cacheKey, filePath);

      console.log(`音声生成完了: ${pattern.character}(${pattern.style}) - ${filePath}`);

      return {
        success: true,
        filePath,
        pattern,
        duration: Date.now() - startTime
      };

    } catch (error) {
      console.error('音声生成エラー:', error);
      
      // フォールバック処理
      const fallbackResult = await this.handleGenerationError(text, options, error);
      if (fallbackResult) {
        return fallbackResult;
      }

      return {
        success: false,
        pattern: this.patternManager.getPatternById('fallback') || {
          id: 'error',
          character: 'error',
          style: 'error',
          speakerId: 0,
          description: 'エラー',
          enabled: false
        },
        error: error instanceof Error ? error.message : '不明なエラー',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 複数パターンで音声を生成
   */
  public async generateMultiple(
    text: string,
    patternCount: number = 3,
    options?: VoiceGenerationOptions
  ): Promise<VoiceGenerationResult[]> {
    const results: VoiceGenerationResult[] = [];
    const availablePatterns = this.patternManager.getAvailablePatterns();
    
    // パターン選択（重複なし）
    const selectedPatterns: VoicePattern[] = [];
    const usedPatternIds = new Set<string>();

    while (selectedPatterns.length < Math.min(patternCount, availablePatterns.length)) {
      const pattern = this.selectPattern(text, {
        ...options,
        excludePatterns: Array.from(usedPatternIds)
      });

      if (!usedPatternIds.has(pattern.id)) {
        selectedPatterns.push(pattern);
        usedPatternIds.add(pattern.id);
      }
    }

    // 並列生成
    const promises = selectedPatterns.map(async (pattern) => {
      const singleOptions: VoiceGenerationOptions = {
        ...options,
        preferredPatterns: [pattern.id]
      };
      return await this.generateSingle(text, singleOptions);
    });

    const results_parallel = await Promise.allSettled(promises);
    
    results_parallel.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          pattern: selectedPatterns[index],
          error: result.reason?.message || '生成失敗',
          duration: 0
        });
      }
    });

    return results;
  }

  /**
   * パターン選択
   */
  private selectPattern(text: string, options?: VoiceGenerationOptions): VoicePattern {
    return this.patternManager.selectPattern(text, {
      preferredPatterns: options?.preferredPatterns,
      excludePatterns: options?.excludePatterns
    });
  }

  /**
   * キャッシュキーを生成
   */
  private generateCacheKey(
    text: string, 
    pattern: VoicePattern, 
    options?: VoiceGenerationOptions
  ): string {
    const data = {
      text,
      patternId: pattern.id,
      speedScale: options?.speedScale || 1.0,
      pitchScale: options?.pitchScale || 0.0,
      volumeScale: options?.volumeScale || 1.0
    };
    return createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * キャッシュから結果を取得
   */
  private getCachedResult(cacheKey: string): { filePath: string; timestamp: number } | null {
    const cached = this.cacheMap.get(cacheKey);
    if (!cached) {
      return null;
    }

    const config = this.patternManager.getConfig();
    const cacheAge = Date.now() - cached.timestamp;
    
    // キャッシュ有効期限チェック
    if (cacheAge > config.cacheDuration * 1000) {
      this.cacheMap.delete(cacheKey);
      return null;
    }

    // ファイル存在確認
    if (!fs.existsSync(cached.filePath)) {
      this.cacheMap.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * キャッシュに追加
   */
  private addToCache(cacheKey: string, filePath: string): void {
    this.cacheMap.set(cacheKey, {
      filePath,
      timestamp: Date.now()
    });
  }

  /**
   * ファイルパスを生成
   */
  private generateFilePath(
    text: string, 
    pattern: VoicePattern, 
    options?: VoiceGenerationOptions
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const textHash = createHash('md5').update(text).digest('hex').substring(0, 8);
    const characterDir = pattern.character.includes('ずんだもん') ? 'zundamon' : 
                        pattern.character.includes('四国めたん') ? 'metan' : 'temp';
    
    const filename = options?.filename || 
      `${pattern.id}_${textHash}_${timestamp}.${options?.format || 'wav'}`;
    
    const targetDir = options?.outputDir || path.join(this.outputDir, characterDir);
    return path.join(targetDir, filename);
  }

  /**
   * 音声ファイルを保存
   */
  private async saveAudioFile(audioBuffer: ArrayBuffer, filePath: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const buffer = Buffer.from(audioBuffer);
      await fs.promises.writeFile(filePath, buffer);
    } catch (error) {
      console.error('音声ファイル保存エラー:', error);
      throw error;
    }
  }

  /**
   * エラー処理・フォールバック
   */
  private async handleGenerationError(
    text: string,
    options?: VoiceGenerationOptions,
    error?: any
  ): Promise<VoiceGenerationResult | null> {
    const config = this.patternManager.getConfig();
    
    // リトライ処理
    if (options && (options as any).retryCount === undefined) {
      for (let retry = 0; retry < config.maxRetries; retry++) {
        console.log(`音声生成リトライ ${retry + 1}/${config.maxRetries}`);
        try {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1))); // 待機
          const retryOptions = { ...options, retryCount: retry + 1 } as any;
          return await this.generateSingle(text, retryOptions);
        } catch (retryError) {
          console.error(`リトライ ${retry + 1} 失敗:`, retryError);
        }
      }
    }

    // テキストファイルとしてフォールバック
    try {
      const fallbackPath = path.join(this.outputDir, 'temp', 
        `fallback_${Date.now()}.txt`);
      await fs.promises.writeFile(fallbackPath, text, 'utf-8');
      
      return {
        success: false,
        filePath: fallbackPath,
        pattern: this.patternManager.getPatternById('fallback') || {
          id: 'fallback',
          character: 'fallback',
          style: 'text',
          speakerId: 0,
          description: 'テキストフォールバック',
          enabled: true
        },
        error: 'VoiceVox生成失敗、テキストファイルを作成',
        duration: 0
      };
    } catch (fallbackError) {
      console.error('フォールバック処理エラー:', fallbackError);
      return null;
    }
  }

  /**
   * キャッシュをクリア
   */
  public clearCache(): void {
    this.cacheMap.clear();
  }

  /**
   * 古いファイルを削除
   */
  public async cleanupOldFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const directories = [
        path.join(this.outputDir, 'zundamon'),
        path.join(this.outputDir, 'metan'),
        path.join(this.outputDir, 'temp')
      ];

      for (const dir of directories) {
        if (fs.existsSync(dir)) {
          const files = await fs.promises.readdir(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.promises.stat(filePath);
            
            if (Date.now() - stats.mtime.getTime() > maxAge) {
              await fs.promises.unlink(filePath);
              console.log(`古いファイルを削除: ${filePath}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('ファイルクリーンアップエラー:', error);
    }
  }

  /**
   * 統計情報を取得
   */
  public getStats(): {
    cacheSize: number;
    totalFiles: number;
    diskUsage: string;
  } {
    try {
      let totalFiles = 0;
      let totalSize = 0;

      const directories = [
        path.join(this.outputDir, 'zundamon'),
        path.join(this.outputDir, 'metan'),
        path.join(this.outputDir, 'temp')
      ];

      directories.forEach(dir => {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          totalFiles += files.length;
          
          files.forEach(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
          });
        }
      });

      const diskUsage = `${(totalSize / 1024 / 1024).toFixed(2)} MB`;

      return {
        cacheSize: this.cacheMap.size,
        totalFiles,
        diskUsage
      };
    } catch (error) {
      console.error('統計情報取得エラー:', error);
      return {
        cacheSize: 0,
        totalFiles: 0,
        diskUsage: '0 MB'
      };
    }
  }
}