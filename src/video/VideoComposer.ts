import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  VideoComposition,
  VideoCompositionResult,
  BatchVideoOptions,
  PythonExecutionResult,
  VideoComposerConfig,
  VideoSettings,
  VideoInfo
} from './types.js';

export class VideoComposer {
  private config: VideoComposerConfig;
  private pythonPath: string;
  private scriptPath: string;

  constructor(config?: VideoComposerConfig) {
    this.config = {
      pythonPath: 'python',
      tempDir: path.join(process.cwd(), 'temp'),
      maxConcurrency: 3,
      timeout: 300000, // 5分
      defaultSettings: {
        video: {
          fps: 30,
          resolution: [1920, 1080],
          codec: 'libx264',
          bitrate: '5000k',
          audio_codec: 'aac'
        },
        subtitle: {
          position: 'bottom',
          margin: 50,
          fade_duration: 0.3
        },
        background: {
          loop: true,
          volume: 0.1
        }
      },
      ...config
    };

    this.pythonPath = this.config.pythonPath!;
    this.scriptPath = this.config.scriptPath || path.join(process.cwd(), 'python', 'video_composer.py');
    this.ensureTempDirectory();
  }

  /**
   * 一時ディレクトリを確保
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.config.tempDir!)) {
      fs.mkdirSync(this.config.tempDir!, { recursive: true });
    }
  }

  /**
   * 単一動画を合成
   */
  public async composeVideo(composition: VideoComposition): Promise<VideoCompositionResult> {
    const startTime = Date.now();

    try {
      console.log(`動画合成開始: ${path.basename(composition.outputPath)}`);
      
      // 設定の準備
      const config = this.prepareCompositionConfig(composition);
      
      // Python スクリプトを実行
      const result = await this.executePythonScript(JSON.stringify(config));
      
      if (!result.success) {
        throw new Error(result.error || 'Python スクリプト実行に失敗');
      }

      // 結果の解析
      const pythonResult = JSON.parse(result.stdout || '{}');
      
      if (!pythonResult.success) {
        throw new Error(pythonResult.error || '動画合成に失敗');
      }

      // 動画情報を取得
      const videoInfo = await this.getVideoInfo(pythonResult.output_path);
      const processingTime = Date.now() - startTime;

      console.log(`動画合成完了: ${pythonResult.output_path} (${processingTime}ms)`);

      return {
        success: true,
        outputPath: pythonResult.output_path,
        composition,
        processingTime,
        videoInfo
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('動画合成エラー:', error);

      return {
        success: false,
        composition,
        processingTime,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * 複数動画を一括合成
   */
  public async composeBatchVideos(
    compositions: VideoComposition[],
    options?: BatchVideoOptions
  ): Promise<VideoCompositionResult[]> {
    console.log(`バッチ動画合成開始: ${compositions.length}件`);
    
    const concurrency = Math.min(
      options?.concurrency || this.config.maxConcurrency!,
      compositions.length
    );

    const results: VideoCompositionResult[] = [];
    const chunks = this.chunkArray(compositions, concurrency);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`バッチ処理 ${chunkIndex + 1}/${chunks.length}: ${chunk.length}件並列処理`);

      // 並列実行
      const chunkPromises = chunk.map(composition => this.composeVideo(composition));
      const chunkResults = await Promise.allSettled(chunkPromises);

      // 結果の整理
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            composition: chunk[index],
            error: result.reason?.message || 'バッチ処理エラー',
            processingTime: 0
          });
        }
      });

      // 進捗報告
      if (options?.onProgress) {
        options.onProgress(results.length, compositions.length);
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`バッチ動画合成完了: ${successCount}/${compositions.length}成功`);

    return results;
  }

  /**
   * 合成設定を準備
   */
  private prepareCompositionConfig(composition: VideoComposition): any {
    // デフォルト設定とマージ
    const settings = this.mergeSettings(this.config.defaultSettings!, composition.settings);
    
    // 出力ディレクトリを確保
    const outputDir = path.dirname(composition.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    return {
      text: composition.text,
      audio_file: composition.audioFile,
      subtitle_image: composition.subtitleImage,
      background_video: composition.backgroundVideo,
      output_path: composition.outputPath,
      settings
    };
  }

  /**
   * 設定をマージ
   */
  private mergeSettings(defaultSettings: VideoSettings, customSettings?: VideoSettings): VideoSettings {
    if (!customSettings) return defaultSettings;

    return {
      video: { ...defaultSettings.video, ...customSettings.video },
      subtitle: { ...defaultSettings.subtitle, ...customSettings.subtitle },
      background: { ...defaultSettings.background, ...customSettings.background }
    };
  }

  /**
   * Python スクリプトを実行
   */
  private async executePythonScript(configJson: string, batch = false): Promise<PythonExecutionResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const args = [this.scriptPath, configJson];
      if (batch) args.push('--batch');

      console.log(`Python実行: ${this.pythonPath} ${args.join(' ')}`);

      const pythonProcess = spawn(this.pythonPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // タイムアウト設定
      const timeout = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        resolve({
          success: false,
          error: 'Python スクリプト実行がタイムアウトしました',
          executionTime: Date.now() - startTime
        });
      }, this.config.timeout!);

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        const executionTime = Date.now() - startTime;

        if (code === 0) {
          resolve({
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            executionTime
          });
        } else {
          resolve({
            success: false,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            error: `Python スクリプトが異常終了 (code: ${code})`,
            executionTime
          });
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: `Python プロセス実行エラー: ${error.message}`,
          executionTime: Date.now() - startTime
        });
      });
    });
  }

  /**
   * 動画情報を取得
   */
  private async getVideoInfo(videoPath: string): Promise<VideoCompositionResult['videoInfo']> {
    try {
      if (!fs.existsSync(videoPath)) {
        return undefined;
      }

      const stats = await fs.promises.stat(videoPath);
      
      // 基本情報
      return {
        duration: 0, // Python側で取得する場合は別途実装
        fileSize: stats.size,
        resolution: [1920, 1080], // デフォルト値
        fps: 30
      };
    } catch (error) {
      console.warn('動画情報取得エラー:', error);
      return undefined;
    }
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
   * システムチェック
   */
  public async checkSystem(): Promise<{
    pythonAvailable: boolean;
    scriptExists: boolean;
    tempDirWritable: boolean;
    dependencies: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const dependencies: string[] = [];

    // Python の確認
    let pythonAvailable = false;
    try {
      const result = await this.executePythonScript('{"test": true}');
      pythonAvailable = result.success;
      if (!result.success) {
        errors.push(`Python実行エラー: ${result.error}`);
      }
    } catch (error) {
      errors.push(`Python確認エラー: ${error}`);
    }

    // スクリプトファイルの確認
    const scriptExists = fs.existsSync(this.scriptPath);
    if (!scriptExists) {
      errors.push(`Python スクリプトが見つかりません: ${this.scriptPath}`);
    }

    // 一時ディレクトリの確認
    let tempDirWritable = false;
    try {
      const testFile = path.join(this.config.tempDir!, 'test.txt');
      await fs.promises.writeFile(testFile, 'test');
      await fs.promises.unlink(testFile);
      tempDirWritable = true;
    } catch (error) {
      errors.push(`一時ディレクトリ書き込み不可: ${this.config.tempDir}`);
    }

    // 依存関係の確認（簡易版）
    try {
      const requirementsPath = path.join(path.dirname(this.scriptPath), 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        const requirements = await fs.promises.readFile(requirementsPath, 'utf-8');
        dependencies.push(...requirements.split('\n').filter(line => line.trim()));
      }
    } catch (error) {
      // requirements.txt が無くても続行
    }

    return {
      pythonAvailable,
      scriptExists,
      tempDirWritable,
      dependencies,
      errors
    };
  }

  /**
   * 背景動画をランダム選択
   */
  public selectRandomBackground(backgroundPaths: string[]): string | undefined {
    if (backgroundPaths.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * backgroundPaths.length);
    return backgroundPaths[randomIndex];
  }

  /**
   * 出力ファイル名を生成
   */
  public generateOutputFilename(
    text: string,
    pattern = 'nanj',
    outputDir?: string,
    extension = 'mp4'
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const textHash = Buffer.from(text.substring(0, 20)).toString('base64').substring(0, 8);
    const filename = `${pattern}_${textHash}_${timestamp}.${extension}`;
    
    return outputDir ? path.join(outputDir, filename) : filename;
  }

  /**
   * 設定を更新
   */
  public updateConfig(newConfig: Partial<VideoComposerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.pythonPath) {
      this.pythonPath = newConfig.pythonPath;
    }
    
    if (newConfig.scriptPath) {
      this.scriptPath = newConfig.scriptPath;
    }
    
    if (newConfig.tempDir) {
      this.ensureTempDirectory();
    }
  }

  /**
   * 統計情報を取得
   */
  public getStats(): {
    config: VideoComposerConfig;
    scriptPath: string;
    pythonPath: string;
  } {
    return {
      config: this.config,
      scriptPath: this.scriptPath,
      pythonPath: this.pythonPath
    };
  }

  /**
   * 一時ファイルをクリーンアップ
   */
  public async cleanupTempFiles(olderThanHours = 24): Promise<number> {
    try {
      const tempDir = this.config.tempDir!;
      if (!fs.existsSync(tempDir)) return 0;

      const files = await fs.promises.readdir(tempDir);
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.promises.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          // ファイル削除エラーは無視
        }
      }

      if (cleanedCount > 0) {
        console.log(`一時ファイルクリーンアップ: ${cleanedCount}ファイル削除`);
      }

      return cleanedCount;
    } catch (error) {
      console.warn('一時ファイルクリーンアップエラー:', error);
      return 0;
    }
  }
}