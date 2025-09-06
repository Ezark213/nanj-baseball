import { createCanvas, loadImage, registerFont } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { 
  SubtitleConfig, 
  SubtitleStyle, 
  SubtitleGenerationOptions, 
  SubtitleRenderResult,
  NanjSubtitlePreset,
  TextAnalysis,
  FontMetrics,
  NanjProcessingConfig
} from './types.js';
import { NanjTextProcessor } from './utils/text-processor.js';

export class SubtitleGenerator {
  private presets: Map<string, NanjSubtitlePreset>;
  private textProcessor: NanjTextProcessor;
  private outputDir: string;
  private fontsLoaded: boolean = false;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || path.join(process.cwd(), 'subtitles');
    this.presets = new Map();
    this.ensureOutputDirectory();
    this.loadPresets();
  }

  /**
   * 出力ディレクトリを確保
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * プリセット設定を読み込み
   */
  private loadPresets(): void {
    try {
      const presetsPath = path.join(__dirname, 'styles', 'nanj-styles.json');
      const presetsData = JSON.parse(fs.readFileSync(presetsPath, 'utf-8'));
      
      // プリセットをMapに変換
      presetsData.presets.forEach((preset: NanjSubtitlePreset) => {
        this.presets.set(preset.id, preset);
      });

      // テキストプロセッサの初期化
      this.textProcessor = new NanjTextProcessor(presetsData.nanjProcessing);
      
      console.log(`字幕プリセット読み込み完了: ${this.presets.size}種類`);
    } catch (error) {
      console.error('プリセット読み込みエラー:', error);
      this.initializeDefaultPresets();
    }
  }

  /**
   * デフォルトプリセットで初期化
   */
  private initializeDefaultPresets(): void {
    const defaultPreset: NanjSubtitlePreset = {
      id: 'nanj-default',
      name: 'なんJ標準',
      description: 'デフォルトスタイル',
      style: {
        fontSize: 48,
        fontFamily: 'Arial',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 3,
        position: 'bottom',
        maxWidth: 900,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backgroundOpacity: 0.7,
        padding: 20,
        margin: 40,
        lineHeight: 1.4,
        textAlign: 'center'
      },
      emotionTags: ['neutral'],
      useCase: '標準的なコメント'
    };

    this.presets.set('nanj-default', defaultPreset);
    
    // 基本的なnanjProcessingConfigを初期化
    const basicNanjConfig: NanjProcessingConfig = {
      termReplacements: { '草': '🌱' },
      emotionKeywords: { 'happy': ['草', '嬉しい'] },
      emphasizeTerms: ['ホームラン'],
      colorMappings: { 'ホームラン': '#FFD700' }
    };
    
    this.textProcessor = new NanjTextProcessor(basicNanjConfig);
  }

  /**
   * フォントを読み込み（必要に応じて）
   */
  private async loadFonts(): Promise<void> {
    if (this.fontsLoaded) return;

    try {
      // システムフォントパスを試行
      const fontPaths = [
        'C:\\Windows\\Fonts\\NotoSansCJK-Regular.ttc',
        'C:\\Windows\\Fonts\\msgothic.ttc',
        '/System/Library/Fonts/Hiragino Sans GB.ttc',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc'
      ];

      for (const fontPath of fontPaths) {
        if (fs.existsSync(fontPath)) {
          registerFont(fontPath, { family: 'Noto Sans JP' });
          console.log(`フォント読み込み成功: ${fontPath}`);
          break;
        }
      }
      
      this.fontsLoaded = true;
    } catch (error) {
      console.warn('フォント読み込み警告:', error);
      // システムデフォルトフォントを使用
    }
  }

  /**
   * 音声ファイルから字幕設定を生成
   */
  public async generateSubtitle(
    text: string,
    audioFilePath: string,
    options?: SubtitleGenerationOptions
  ): Promise<SubtitleConfig> {
    try {
      // 音声ファイルの長さを取得（実装簡略化：固定値使用）
      const duration = await this.getAudioDuration(audioFilePath);
      
      // テキスト解析
      const analysis = this.textProcessor.processNanjText(text);
      
      // スタイル決定
      const style = this.determineStyle(analysis, options);
      
      return {
        text: analysis.processedText,
        startTime: 0,
        duration,
        style,
        id: this.generateSubtitleId(text),
        outputPath: options?.outputDir || this.outputDir
      };
    } catch (error) {
      console.error('字幕設定生成エラー:', error);
      throw error;
    }
  }

  /**
   * 字幕画像をレンダリング
   */
  public async renderSubtitleImage(
    config: SubtitleConfig,
    outputPath?: string
  ): Promise<SubtitleRenderResult> {
    const startTime = Date.now();
    
    try {
      await this.loadFonts();
      
      // 出力パス決定
      const finalOutputPath = outputPath || path.join(
        config.outputPath || this.outputDir,
        `${config.id || 'subtitle'}_${Date.now()}.png`
      );

      // テキストを行に分割
      const lines = this.splitTextIntoLines(config.text, config.style);
      
      // キャンバスサイズ計算
      const dimensions = this.calculateCanvasDimensions(lines, config.style);
      
      // キャンバス作成
      const canvas = createCanvas(dimensions.width, dimensions.height);
      const ctx = canvas.getContext('2d');

      // 背景描画
      this.drawBackground(ctx, dimensions, config.style);
      
      // テキスト描画
      this.drawText(ctx, lines, config.style, dimensions);

      // ファイル保存
      const buffer = canvas.toBuffer('image/png');
      await fs.promises.writeFile(finalOutputPath, buffer);

      const renderTime = Date.now() - startTime;
      
      console.log(`字幕画像生成完了: ${finalOutputPath} (${renderTime}ms)`);
      
      return {
        success: true,
        outputPath: finalOutputPath,
        config,
        dimensions,
        lineCount: lines.length,
        renderTime
      };
      
    } catch (error) {
      const renderTime = Date.now() - startTime;
      console.error('字幕画像レンダリングエラー:', error);
      
      return {
        success: false,
        config,
        error: error instanceof Error ? error.message : '不明なエラー',
        renderTime
      };
    }
  }

  /**
   * 音声ファイルの長さを取得（簡略化実装）
   */
  private async getAudioDuration(audioFilePath: string): Promise<number> {
    try {
      // 実際の実装ではffprobeやnode-ffmpegを使用
      // ここでは推定値を返す
      const stats = await fs.promises.stat(audioFilePath);
      const fileSizeKB = stats.size / 1024;
      
      // WAVファイルの場合の概算（44.1kHz, 16bit, mono）
      const estimatedSeconds = fileSizeKB / 88.2;
      return Math.max(1, Math.round(estimatedSeconds * 10) / 10);
    } catch (error) {
      console.warn('音声ファイル長取得エラー、デフォルト値使用:', error);
      return 3.0; // デフォルト3秒
    }
  }

  /**
   * スタイルを決定
   */
  private determineStyle(
    analysis: TextAnalysis, 
    options?: SubtitleGenerationOptions
  ): SubtitleStyle {
    let baseStyle: SubtitleStyle;
    
    if (options?.preset && this.presets.has(options.preset)) {
      baseStyle = { ...this.presets.get(options.preset)!.style };
    } else if (analysis.recommendedStyle && this.presets.has(analysis.recommendedStyle)) {
      baseStyle = { ...this.presets.get(analysis.recommendedStyle)!.style };
    } else {
      baseStyle = { ...this.presets.get('nanj-default')!.style };
    }
    
    // カスタムスタイルでオーバーライド
    if (options?.customStyle) {
      Object.assign(baseStyle, options.customStyle);
    }
    
    return baseStyle;
  }

  /**
   * 字幕IDを生成
   */
  private generateSubtitleId(text: string): string {
    const timestamp = Date.now().toString(36);
    const textHash = Buffer.from(text).toString('base64').substring(0, 8);
    return `sub_${textHash}_${timestamp}`;
  }

  /**
   * テキストを行に分割
   */
  private splitTextIntoLines(text: string, style: SubtitleStyle): string[] {
    const maxCharsPerLine = Math.floor(style.maxWidth / (style.fontSize * 0.6));
    return this.textProcessor.autoWrapText(text, style.maxWidth, style.fontSize);
  }

  /**
   * キャンバス寸法を計算
   */
  private calculateCanvasDimensions(
    lines: string[], 
    style: SubtitleStyle
  ): { width: number; height: number } {
    const padding = style.padding || 20;
    const margin = style.margin || 40;
    const lineHeight = style.fontSize * (style.lineHeight || 1.4);
    
    const textHeight = lines.length * lineHeight;
    const totalHeight = textHeight + (padding * 2) + (margin * 2);
    const totalWidth = Math.min(style.maxWidth + (padding * 2) + (margin * 2), 1920);
    
    return {
      width: Math.max(totalWidth, 400),
      height: Math.max(totalHeight, style.fontSize + 40)
    };
  }

  /**
   * 背景を描画
   */
  private drawBackground(
    ctx: CanvasRenderingContext2D,
    dimensions: { width: number; height: number },
    style: SubtitleStyle
  ): void {
    if (style.backgroundColor) {
      ctx.fillStyle = style.backgroundColor;
      
      const margin = style.margin || 40;
      const padding = style.padding || 20;
      
      // 角丸矩形の背景
      const x = margin;
      const y = margin;
      const width = dimensions.width - (margin * 2);
      const height = dimensions.height - (margin * 2);
      const radius = 10;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  /**
   * テキストを描画
   */
  private drawText(
    ctx: CanvasRenderingContext2D,
    lines: string[],
    style: SubtitleStyle,
    dimensions: { width: number; height: number }
  ): void {
    // フォント設定
    ctx.font = `${style.fontSize}px "${style.fontFamily}", Arial, sans-serif`;
    ctx.textAlign = style.textAlign as CanvasTextAlign || 'center';
    ctx.textBaseline = 'middle';
    
    const lineHeight = style.fontSize * (style.lineHeight || 1.4);
    const totalTextHeight = lines.length * lineHeight;
    const startY = (dimensions.height - totalTextHeight) / 2 + (style.fontSize / 2);
    
    lines.forEach((line, index) => {
      const y = startY + (index * lineHeight);
      const x = dimensions.width / 2;
      
      // 影の描画
      if (style.shadow) {
        ctx.shadowColor = style.shadow.color;
        ctx.shadowBlur = style.shadow.blur;
        ctx.shadowOffsetX = style.shadow.offsetX;
        ctx.shadowOffsetY = style.shadow.offsetY;
      }
      
      // 縁取りの描画
      if (style.strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.strokeWidth;
        ctx.strokeText(line, x, y);
      }
      
      // テキストの描画
      ctx.fillStyle = style.color;
      ctx.fillText(line, x, y);
      
      // 影をリセット
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });
  }

  /**
   * 利用可能なプリセット一覧を取得
   */
  public getAvailablePresets(): NanjSubtitlePreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * プリセットをIDで取得
   */
  public getPresetById(id: string): NanjSubtitlePreset | undefined {
    return this.presets.get(id);
  }

  /**
   * カスタムプリセットを追加
   */
  public addPreset(preset: NanjSubtitlePreset): void {
    this.presets.set(preset.id, preset);
  }

  /**
   * バッチ処理：複数の字幕を一括生成
   */
  public async generateBatchSubtitles(
    texts: string[],
    audioFiles: string[],
    options?: SubtitleGenerationOptions
  ): Promise<SubtitleRenderResult[]> {
    if (texts.length !== audioFiles.length) {
      throw new Error('テキストと音声ファイルの数が一致しません');
    }

    const results: SubtitleRenderResult[] = [];
    
    for (let i = 0; i < texts.length; i++) {
      try {
        const config = await this.generateSubtitle(texts[i], audioFiles[i], options);
        const result = await this.renderSubtitleImage(config);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          config: {
            text: texts[i],
            startTime: 0,
            duration: 0,
            style: this.presets.get('nanj-default')!.style
          },
          error: error instanceof Error ? error.message : '不明なエラー'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`バッチ字幕生成完了: ${successCount}/${texts.length}成功`);
    
    return results;
  }

  /**
   * 出力ディレクトリを設定
   */
  public setOutputDir(dir: string): void {
    this.outputDir = dir;
    this.ensureOutputDirectory();
  }

  /**
   * 統計情報を取得
   */
  public getStats(): {
    presetsCount: number;
    outputDir: string;
    fontsLoaded: boolean;
  } {
    return {
      presetsCount: this.presets.size,
      outputDir: this.outputDir,
      fontsLoaded: this.fontsLoaded
    };
  }
}