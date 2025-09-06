import { Speaker, AudioQuery } from '../types.js';

export class VoiceVoxClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = 'http://localhost:50021', timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * VoiceVoxサーバーの接続確認
   */
  public async checkConnection(): Promise<boolean> {
    try {
      const response = await this.fetch('/version', { method: 'GET' });
      return response.ok;
    } catch (error) {
      console.error('VoiceVox接続エラー:', error);
      return false;
    }
  }

  /**
   * 利用可能なスピーカー一覧を取得
   */
  public async getSpeakers(): Promise<Speaker[]> {
    try {
      const response = await this.fetch('/speakers', { method: 'GET' });
      if (!response.ok) {
        throw new Error(`スピーカー一覧取得エラー: ${response.status}`);
      }
      return await response.json() as Speaker[];
    } catch (error) {
      console.error('スピーカー一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 音声クエリを生成
   */
  public async generateAudioQuery(
    text: string, 
    speakerId: number,
    coreVersion?: string
  ): Promise<AudioQuery> {
    try {
      const params = new URLSearchParams({
        text: text,
        speaker: speakerId.toString()
      });

      if (coreVersion) {
        params.append('core_version', coreVersion);
      }

      const response = await this.fetch(`/audio_query?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`音声クエリ生成エラー: ${response.status} - ${await response.text()}`);
      }

      return await response.json() as AudioQuery;
    } catch (error) {
      console.error('音声クエリ生成エラー:', error);
      throw error;
    }
  }

  /**
   * 音声合成を実行
   */
  public async synthesize(
    audioQuery: AudioQuery, 
    speakerId: number,
    coreVersion?: string
  ): Promise<ArrayBuffer> {
    try {
      const params = new URLSearchParams({
        speaker: speakerId.toString()
      });

      if (coreVersion) {
        params.append('core_version', coreVersion);
      }

      const response = await this.fetch(`/synthesis?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(audioQuery)
      });

      if (!response.ok) {
        throw new Error(`音声合成エラー: ${response.status} - ${await response.text()}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('音声合成エラー:', error);
      throw error;
    }
  }

  /**
   * テキストから直接音声を生成（簡易版）
   */
  public async generateSpeech(
    text: string, 
    speakerId: number,
    options?: {
      speedScale?: number;
      pitchScale?: number;
      intonationScale?: number;
      volumeScale?: number;
      coreVersion?: string;
    }
  ): Promise<ArrayBuffer> {
    try {
      // 1. 音声クエリを生成
      const audioQuery = await this.generateAudioQuery(text, speakerId, options?.coreVersion);

      // 2. オプションで音声パラメータを調整
      if (options) {
        if (options.speedScale !== undefined) {
          audioQuery.speedScale = options.speedScale;
        }
        if (options.pitchScale !== undefined) {
          audioQuery.pitchScale = options.pitchScale;
        }
        if (options.intonationScale !== undefined) {
          audioQuery.intonationScale = options.intonationScale;
        }
        if (options.volumeScale !== undefined) {
          audioQuery.volumeScale = options.volumeScale;
        }
      }

      // 3. 音声合成を実行
      return await this.synthesize(audioQuery, speakerId, options?.coreVersion);
    } catch (error) {
      console.error('音声生成エラー:', error);
      throw error;
    }
  }

  /**
   * バージョン情報を取得
   */
  public async getVersion(): Promise<string> {
    try {
      const response = await this.fetch('/version', { method: 'GET' });
      if (!response.ok) {
        throw new Error(`バージョン取得エラー: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('バージョン取得エラー:', error);
      throw error;
    }
  }

  /**
   * コアバージョン一覧を取得
   */
  public async getCoreVersions(): Promise<string[]> {
    try {
      const response = await this.fetch('/core_versions', { method: 'GET' });
      if (!response.ok) {
        throw new Error(`コアバージョン取得エラー: ${response.status}`);
      }
      return await response.json() as string[];
    } catch (error) {
      console.error('コアバージョン取得エラー:', error);
      throw error;
    }
  }

  /**
   * プリセット一覧を取得
   */
  public async getPresets(): Promise<any[]> {
    try {
      const response = await this.fetch('/presets', { method: 'GET' });
      if (!response.ok) {
        throw new Error(`プリセット取得エラー: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('プリセット取得エラー:', error);
      throw error;
    }
  }

  /**
   * HTTPリクエストを送信するヘルパーメソッド
   */
  private async fetch(path: string, options: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`リクエストタイムアウト: ${url}`);
      }
      throw error;
    }
  }

  /**
   * ベースURLを設定
   */
  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * タイムアウト時間を設定
   */
  public setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * ヘルスチェック
   */
  public async healthCheck(): Promise<{
    isConnected: boolean;
    version?: string;
    speakers?: number;
    error?: string;
  }> {
    try {
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        return { 
          isConnected: false, 
          error: 'VoiceVoxサーバーに接続できません' 
        };
      }

      const [version, speakers] = await Promise.all([
        this.getVersion().catch(() => 'unknown'),
        this.getSpeakers().catch(() => [])
      ]);

      return {
        isConnected: true,
        version,
        speakers: speakers.length
      };
    } catch (error) {
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }
}