import * as fs from 'fs';
import * as path from 'path';
import { VoiceGenerationResult } from '../types.js';

export interface AudioFileInfo {
  filePath: string;
  filename: string;
  character: string;
  pattern: string;
  size: number;
  createdAt: Date;
  duration?: number;
  text?: string;
}

export class AudioFileManager {
  private baseDir: string;
  private indexFile: string;
  private fileIndex: Map<string, AudioFileInfo>;

  constructor(baseDir: string = path.join(process.cwd(), 'audio')) {
    this.baseDir = baseDir;
    this.indexFile = path.join(baseDir, '.audio-index.json');
    this.fileIndex = new Map();
    this.ensureDirectories();
    this.loadIndex();
  }

  /**
   * ディレクトリ構造を確保
   */
  private ensureDirectories(): void {
    const directories = [
      this.baseDir,
      path.join(this.baseDir, 'zundamon'),
      path.join(this.baseDir, 'metan'),
      path.join(this.baseDir, 'temp'),
      path.join(this.baseDir, 'archive'),
      path.join(this.baseDir, 'backup')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * インデックスを読み込み
   */
  private loadIndex(): void {
    try {
      if (fs.existsSync(this.indexFile)) {
        const indexData = JSON.parse(fs.readFileSync(this.indexFile, 'utf-8'));
        this.fileIndex.clear();
        
        for (const [key, value] of Object.entries(indexData)) {
          this.fileIndex.set(key, {
            ...(value as any),
            createdAt: new Date((value as any).createdAt)
          });
        }
      }
    } catch (error) {
      console.error('インデックス読み込みエラー:', error);
      this.fileIndex.clear();
    }
  }

  /**
   * インデックスを保存
   */
  private saveIndex(): void {
    try {
      const indexData: Record<string, any> = {};
      for (const [key, value] of this.fileIndex.entries()) {
        indexData[key] = {
          ...value,
          createdAt: value.createdAt.toISOString()
        };
      }
      
      fs.writeFileSync(this.indexFile, JSON.stringify(indexData, null, 2));
    } catch (error) {
      console.error('インデックス保存エラー:', error);
    }
  }

  /**
   * 音声生成結果を登録
   */
  public registerAudioFile(
    result: VoiceGenerationResult, 
    text: string,
    metadata?: { tags?: string[]; description?: string }
  ): void {
    if (!result.success || !result.filePath) {
      return;
    }

    try {
      const stats = fs.statSync(result.filePath);
      const filename = path.basename(result.filePath);
      const character = this.extractCharacterFromPath(result.filePath);

      const fileInfo: AudioFileInfo = {
        filePath: result.filePath,
        filename,
        character,
        pattern: result.pattern.id,
        size: stats.size,
        createdAt: stats.birthtime,
        duration: result.duration,
        text
      };

      // メタデータがあれば追加
      if (metadata) {
        (fileInfo as any).metadata = metadata;
      }

      this.fileIndex.set(result.filePath, fileInfo);
      this.saveIndex();

      console.log(`音声ファイル登録: ${filename}`);
    } catch (error) {
      console.error('音声ファイル登録エラー:', error);
    }
  }

  /**
   * パスからキャラクターを抽出
   */
  private extractCharacterFromPath(filePath: string): string {
    if (filePath.includes('zundamon')) return 'ずんだもん';
    if (filePath.includes('metan')) return '四国めたん';
    return 'unknown';
  }

  /**
   * 音声ファイル一覧を取得
   */
  public getAudioFiles(options?: {
    character?: string;
    pattern?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    sortBy?: 'createdAt' | 'size' | 'filename';
    sortOrder?: 'asc' | 'desc';
  }): AudioFileInfo[] {
    let files = Array.from(this.fileIndex.values());

    // フィルタリング
    if (options?.character) {
      files = files.filter(f => f.character === options.character);
    }
    
    if (options?.pattern) {
      files = files.filter(f => f.pattern === options.pattern);
    }

    if (options?.dateFrom) {
      files = files.filter(f => f.createdAt >= options.dateFrom!);
    }

    if (options?.dateTo) {
      files = files.filter(f => f.createdAt <= options.dateTo!);
    }

    // ソート
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    
    files.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      
      if (sortBy === 'createdAt') {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // 制限
    if (options?.limit) {
      files = files.slice(0, options.limit);
    }

    return files;
  }

  /**
   * 音声ファイルを検索
   */
  public searchAudioFiles(query: string): AudioFileInfo[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.fileIndex.values()).filter(file => {
      return (
        file.filename.toLowerCase().includes(lowerQuery) ||
        file.character.toLowerCase().includes(lowerQuery) ||
        file.pattern.toLowerCase().includes(lowerQuery) ||
        (file.text && file.text.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * 音声ファイルを削除
   */
  public async deleteAudioFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      
      this.fileIndex.delete(filePath);
      this.saveIndex();
      
      console.log(`音声ファイル削除: ${path.basename(filePath)}`);
      return true;
    } catch (error) {
      console.error('音声ファイル削除エラー:', error);
      return false;
    }
  }

  /**
   * 複数の音声ファイルを削除
   */
  public async deleteMultipleFiles(filePaths: string[]): Promise<{
    success: string[];
    failed: string[];
  }> {
    const results = { success: [], failed: [] } as any;
    
    for (const filePath of filePaths) {
      const success = await this.deleteAudioFile(filePath);
      if (success) {
        results.success.push(filePath);
      } else {
        results.failed.push(filePath);
      }
    }
    
    return results;
  }

  /**
   * 音声ファイルをアーカイブ
   */
  public async archiveAudioFile(filePath: string): Promise<string | null> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('ファイルが存在しません');
      }

      const filename = path.basename(filePath);
      const timestamp = new Date().toISOString().split('T')[0];
      const archivePath = path.join(this.baseDir, 'archive', `${timestamp}_${filename}`);

      // ファイルをアーカイブディレクトリにコピー
      await fs.promises.copyFile(filePath, archivePath);

      // 元ファイルを削除
      await fs.promises.unlink(filePath);

      // インデックスを更新
      const fileInfo = this.fileIndex.get(filePath);
      if (fileInfo) {
        fileInfo.filePath = archivePath;
        this.fileIndex.delete(filePath);
        this.fileIndex.set(archivePath, fileInfo);
        this.saveIndex();
      }

      console.log(`音声ファイルアーカイブ: ${filename} -> ${archivePath}`);
      return archivePath;
    } catch (error) {
      console.error('音声ファイルアーカイブエラー:', error);
      return null;
    }
  }

  /**
   * 古いファイルを自動クリーンアップ
   */
  public async autoCleanup(options: {
    maxAge?: number; // ミリ秒
    maxFiles?: number;
    maxSize?: number; // バイト
  } = {}): Promise<{
    deletedCount: number;
    freedSpace: number;
    errors: string[];
  }> {
    const results = {
      deletedCount: 0,
      freedSpace: 0,
      errors: []
    };

    try {
      const files = this.getAudioFiles({ sortBy: 'createdAt', sortOrder: 'desc' });
      const now = Date.now();

      // 古いファイルの削除（年齢ベース）
      if (options.maxAge) {
        const filesToDelete = files.filter(f => 
          now - f.createdAt.getTime() > options.maxAge!
        );

        for (const file of filesToDelete) {
          const success = await this.deleteAudioFile(file.filePath);
          if (success) {
            results.deletedCount++;
            results.freedSpace += file.size;
          } else {
            results.errors.push(`削除失敗: ${file.filename}`);
          }
        }
      }

      // ファイル数制限
      if (options.maxFiles && files.length > options.maxFiles) {
        const excessFiles = files.slice(options.maxFiles);
        
        for (const file of excessFiles) {
          const success = await this.deleteAudioFile(file.filePath);
          if (success) {
            results.deletedCount++;
            results.freedSpace += file.size;
          } else {
            results.errors.push(`削除失敗: ${file.filename}`);
          }
        }
      }

      // サイズ制限
      if (options.maxSize) {
        let currentSize = files.reduce((sum, f) => sum + f.size, 0);
        
        for (const file of files) {
          if (currentSize <= options.maxSize) break;
          
          const success = await this.deleteAudioFile(file.filePath);
          if (success) {
            currentSize -= file.size;
            results.deletedCount++;
            results.freedSpace += file.size;
          } else {
            results.errors.push(`削除失敗: ${file.filename}`);
          }
        }
      }

      console.log(`クリーンアップ完了: ${results.deletedCount}ファイル削除, ${(results.freedSpace / 1024 / 1024).toFixed(2)}MB解放`);
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : '不明なエラー');
    }

    return results;
  }

  /**
   * 統計情報を取得
   */
  public getStatistics(): {
    totalFiles: number;
    totalSize: number;
    byCharacter: Record<string, number>;
    byPattern: Record<string, number>;
    averageSize: number;
    oldestFile?: string;
    newestFile?: string;
  } {
    const files = Array.from(this.fileIndex.values());
    
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      byCharacter: {} as Record<string, number>,
      byPattern: {} as Record<string, number>,
      averageSize: 0,
      oldestFile: undefined as string | undefined,
      newestFile: undefined as string | undefined
    };

    if (files.length === 0) {
      return stats;
    }

    // キャラクター別統計
    files.forEach(file => {
      stats.byCharacter[file.character] = (stats.byCharacter[file.character] || 0) + 1;
      stats.byPattern[file.pattern] = (stats.byPattern[file.pattern] || 0) + 1;
    });

    // 平均サイズ
    stats.averageSize = stats.totalSize / stats.totalFiles;

    // 最古・最新ファイル
    const sortedByDate = [...files].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    stats.oldestFile = sortedByDate[0]?.filename;
    stats.newestFile = sortedByDate[sortedByDate.length - 1]?.filename;

    return stats;
  }

  /**
   * バックアップを作成
   */
  public async createBackup(): Promise<string | null> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.baseDir, 'backup', `backup_${timestamp}`);
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // インデックスファイルをコピー
      if (fs.existsSync(this.indexFile)) {
        await fs.promises.copyFile(
          this.indexFile,
          path.join(backupDir, '.audio-index.json')
        );
      }

      console.log(`バックアップ作成: ${backupDir}`);
      return backupDir;
    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      return null;
    }
  }

  /**
   * インデックスを再構築
   */
  public async rebuildIndex(): Promise<void> {
    console.log('インデックス再構築開始...');
    
    try {
      this.fileIndex.clear();
      const directories = ['zundamon', 'metan', 'temp'];
      
      for (const dir of directories) {
        const dirPath = path.join(this.baseDir, dir);
        if (fs.existsSync(dirPath)) {
          const files = await fs.promises.readdir(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.promises.stat(filePath);
            
            if (stats.isFile() && (file.endsWith('.wav') || file.endsWith('.mp3'))) {
              const fileInfo: AudioFileInfo = {
                filePath,
                filename: file,
                character: this.extractCharacterFromPath(filePath),
                pattern: 'unknown',
                size: stats.size,
                createdAt: stats.birthtime
              };
              
              this.fileIndex.set(filePath, fileInfo);
            }
          }
        }
      }
      
      this.saveIndex();
      console.log(`インデックス再構築完了: ${this.fileIndex.size}ファイル`);
    } catch (error) {
      console.error('インデックス再構築エラー:', error);
    }
  }
}