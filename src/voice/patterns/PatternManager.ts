import { VoiceConfig, VoicePattern, ConditionalRules, EmotionRule, ContentRule, TimeRule } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';

export class PatternManager {
  private config: VoiceConfig;
  private patterns: Map<string, VoicePattern>;
  private currentRotationIndex: number = 0;

  constructor(configPath?: string) {
    this.patterns = new Map();
    this.loadConfig(configPath);
  }

  /**
   * 設定ファイルを読み込む
   */
  private loadConfig(configPath?: string): void {
    try {
      const defaultConfigPath = path.join(process.cwd(), 'config', 'voice-patterns.json');
      const targetPath = configPath || defaultConfigPath;
      
      if (!fs.existsSync(targetPath)) {
        throw new Error(`設定ファイルが見つかりません: ${targetPath}`);
      }

      const configData = fs.readFileSync(targetPath, 'utf-8');
      this.config = JSON.parse(configData) as VoiceConfig;
      
      // パターンをMapに変換
      this.patterns.clear();
      this.config.patterns.forEach(pattern => {
        if (pattern.enabled) {
          this.patterns.set(pattern.id, pattern);
        }
      });

      console.log(`音声パターンを読み込みました: ${this.patterns.size}個のパターン`);
    } catch (error) {
      console.error('設定ファイル読み込みエラー:', error);
      this.initializeDefaultConfig();
    }
  }

  /**
   * デフォルト設定で初期化
   */
  private initializeDefaultConfig(): void {
    this.config = {
      patterns: [
        {
          id: 'zundamon-normal',
          character: 'ずんだもん',
          style: 'ノーマル',
          speakerId: 3,
          description: '標準的なずんだもんの声',
          enabled: true,
          priority: 1
        }
      ],
      selectionMode: 'random',
      conditionalRules: {
        timeRules: [],
        emotionRules: [],
        contentRules: []
      },
      defaultPattern: 'zundamon-normal',
      maxRetries: 3,
      cacheDuration: 3600
    };
    
    this.patterns.set('zundamon-normal', this.config.patterns[0]);
  }

  /**
   * テキストと条件に基づいて音声パターンを選択
   */
  public selectPattern(text: string, options?: {
    preferredPatterns?: string[];
    excludePatterns?: string[];
    forceMode?: 'random' | 'rotation' | 'conditional' | 'priority';
  }): VoicePattern {
    const mode = options?.forceMode || this.config.selectionMode;
    let candidates: VoicePattern[] = Array.from(this.patterns.values());

    // フィルタリング
    if (options?.preferredPatterns) {
      const preferred = candidates.filter(p => options.preferredPatterns!.includes(p.id));
      if (preferred.length > 0) {
        candidates = preferred;
      }
    }

    if (options?.excludePatterns) {
      candidates = candidates.filter(p => !options.excludePatterns!.includes(p.id));
    }

    // 選択モードに基づいて選択
    switch (mode) {
      case 'random':
        return this.selectRandom(candidates);
      case 'rotation':
        return this.selectRotation(candidates);
      case 'conditional':
        return this.selectConditional(text, candidates);
      case 'priority':
        return this.selectByPriority(candidates);
      default:
        return this.selectRandom(candidates);
    }
  }

  /**
   * ランダム選択
   */
  private selectRandom(candidates: VoicePattern[]): VoicePattern {
    if (candidates.length === 0) {
      return this.getDefaultPattern();
    }
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  /**
   * ローテーション選択
   */
  private selectRotation(candidates: VoicePattern[]): VoicePattern {
    if (candidates.length === 0) {
      return this.getDefaultPattern();
    }
    
    const pattern = candidates[this.currentRotationIndex % candidates.length];
    this.currentRotationIndex++;
    return pattern;
  }

  /**
   * 条件付き選択
   */
  private selectConditional(text: string, candidates: VoicePattern[]): VoicePattern {
    // 時間ルールをチェック
    const timeBasedPatterns = this.getTimeBasedPatterns();
    if (timeBasedPatterns.length > 0) {
      const timeCandidate = candidates.filter(p => timeBasedPatterns.includes(p.id));
      if (timeCandidate.length > 0) {
        candidates = timeCandidate;
      }
    }

    // 感情ルールをチェック
    const emotionBasedPatterns = this.getEmotionBasedPatterns(text);
    if (emotionBasedPatterns.length > 0) {
      const emotionCandidates = candidates.filter(p => emotionBasedPatterns.includes(p.id));
      if (emotionCandidates.length > 0) {
        candidates = emotionCandidates;
      }
    }

    // コンテンツルールをチェック
    const contentBasedPatterns = this.getContentBasedPatterns(text);
    if (contentBasedPatterns.length > 0) {
      const contentCandidates = candidates.filter(p => contentBasedPatterns.includes(p.id));
      if (contentCandidates.length > 0) {
        candidates = contentCandidates;
      }
    }

    return this.selectRandom(candidates);
  }

  /**
   * 優先度による選択
   */
  private selectByPriority(candidates: VoicePattern[]): VoicePattern {
    if (candidates.length === 0) {
      return this.getDefaultPattern();
    }

    // 優先度でソート（数値が小さいほど高優先度）
    candidates.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    return candidates[0];
  }

  /**
   * 時間に基づくパターンを取得
   */
  private getTimeBasedPatterns(): string[] {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    for (const rule of this.config.conditionalRules.timeRules) {
      const [startTime, endTime] = rule.timeRange.split('-');
      if (this.isTimeInRange(currentTime, startTime, endTime)) {
        return rule.patternIds;
      }
    }
    
    return [];
  }

  /**
   * 感情に基づくパターンを取得
   */
  private getEmotionBasedPatterns(text: string): string[] {
    for (const rule of this.config.conditionalRules.emotionRules) {
      if (rule.keywords.some(keyword => text.includes(keyword))) {
        return rule.patternIds;
      }
    }
    return [];
  }

  /**
   * コンテンツに基づくパターンを取得
   */
  private getContentBasedPatterns(text: string): string[] {
    const results: string[] = [];
    
    for (const rule of this.config.conditionalRules.contentRules) {
      let matches = false;
      
      switch (rule.type) {
        case 'length':
          matches = text.length > (rule.condition as number);
          break;
        case 'contains':
          matches = text.includes(rule.condition as string);
          break;
        case 'startsWith':
          matches = text.startsWith(rule.condition as string);
          break;
        case 'endsWith':
          matches = text.endsWith(rule.condition as string);
          break;
      }
      
      if (matches) {
        results.push(...rule.patternIds);
      }
    }
    
    return [...new Set(results)]; // 重複除去
  }

  /**
   * 時間が指定範囲内かチェック
   */
  private isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    
    if (start <= end) {
      return current >= start && current <= end;
    } else {
      // 日跨ぎの場合
      return current >= start || current <= end;
    }
  }

  /**
   * 時刻を分に変換
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * デフォルトパターンを取得
   */
  private getDefaultPattern(): VoicePattern {
    const defaultPattern = this.patterns.get(this.config.defaultPattern);
    if (defaultPattern) {
      return defaultPattern;
    }
    
    // デフォルトパターンが見つからない場合、最初のパターンを返す
    const firstPattern = Array.from(this.patterns.values())[0];
    if (firstPattern) {
      return firstPattern;
    }
    
    // パターンが全くない場合のフォールバック
    return {
      id: 'fallback',
      character: 'ずんだもん',
      style: 'ノーマル',
      speakerId: 3,
      description: 'フォールバックパターン',
      enabled: true
    };
  }

  /**
   * 利用可能なパターンを取得
   */
  public getAvailablePatterns(): VoicePattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * パターンをIDで取得
   */
  public getPatternById(id: string): VoicePattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * 設定を取得
   */
  public getConfig(): VoiceConfig {
    return { ...this.config };
  }

  /**
   * パターンを動的に追加
   */
  public addPattern(pattern: VoicePattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * パターンを無効化
   */
  public disablePattern(patternId: string): void {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.enabled = false;
      this.patterns.delete(patternId);
    }
  }

  /**
   * パターンを有効化
   */
  public enablePattern(patternId: string): void {
    const originalPattern = this.config.patterns.find(p => p.id === patternId);
    if (originalPattern) {
      originalPattern.enabled = true;
      this.patterns.set(patternId, originalPattern);
    }
  }
}