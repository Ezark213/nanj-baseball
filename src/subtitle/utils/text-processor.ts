import { TextAnalysis, NanjProcessingConfig } from '../types.js';

export class NanjTextProcessor {
  private nanjConfig: NanjProcessingConfig;

  constructor(nanjConfig: NanjProcessingConfig) {
    this.nanjConfig = nanjConfig;
  }

  /**
   * なんJ語テキストを解析・処理
   */
  public processNanjText(text: string): TextAnalysis {
    const originalText = text;
    let processedText = text;

    // 1. 特殊文字の置換
    processedText = this.replaceNanjTerms(processedText);

    // 2. なんJ語の検出
    const nanjTerms = this.detectNanjTerms(originalText);

    // 3. 感情分析
    const emotion = this.analyzeEmotion(originalText);

    // 4. 読み上げ時間の推定
    const estimatedReadingTime = this.estimateReadingTime(processedText);

    // 5. 複雑度判定
    const complexity = this.determineComplexity(processedText);

    // 6. 推奨スタイル決定
    const recommendedStyle = this.recommendStyle(emotion, nanjTerms, complexity);

    return {
      originalText,
      processedText,
      emotion,
      nanjTerms,
      estimatedReadingTime,
      complexity,
      recommendedStyle
    };
  }

  /**
   * 特殊文字・なんJ語の置換
   */
  private replaceNanjTerms(text: string): string {
    let result = text;
    
    Object.entries(this.nanjConfig.termReplacements).forEach(([term, replacement]) => {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, replacement);
    });

    return result;
  }

  /**
   * なんJ語の検出
   */
  private detectNanjTerms(text: string): string[] {
    const detectedTerms: string[] = [];
    const allTerms = [
      ...Object.keys(this.nanjConfig.termReplacements),
      ...this.nanjConfig.emphasizeTerms,
      ...Object.keys(this.nanjConfig.colorMappings)
    ];

    allTerms.forEach(term => {
      if (text.includes(term)) {
        detectedTerms.push(term);
      }
    });

    // なんJ語特有のパターンも検出
    const nanjPatterns = [
      /ンゴ/g,
      /ニキ/g,
      /やで/g,
      /やろ/g,
      /なんや/g,
      /せやな/g,
      /ワイ/g,
      /サンガツ/g,
      /草/g,
      /有能|無能/g,
      /ぐう(畜|聖|可愛)/g
    ];

    nanjPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        detectedTerms.push(...matches);
      }
    });

    return [...new Set(detectedTerms)]; // 重複除去
  }

  /**
   * 感情分析
   */
  private analyzeEmotion(text: string): TextAnalysis['emotion'] {
    const emotions = Object.entries(this.nanjConfig.emotionKeywords);
    let maxScore = 0;
    let detectedEmotion: TextAnalysis['emotion'] = 'neutral';

    emotions.forEach(([emotion, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      });

      if (score > maxScore) {
        maxScore = score;
        detectedEmotion = emotion as TextAnalysis['emotion'];
      }
    });

    // 特殊パターンの検出
    if (text.includes('草') || text.includes('ワロタ')) {
      detectedEmotion = 'happy';
    } else if (text.includes('ファッ') || text.includes('マジかよ')) {
      detectedEmotion = 'excited';
    }

    return detectedEmotion;
  }

  /**
   * 読み上げ時間の推定（日本語基準）
   */
  private estimateReadingTime(text: string): number {
    // 日本語の平均読み上げ速度: 約400文字/分 ≈ 6.7文字/秒
    const charactersPerSecond = 6.7;
    const characters = this.countJapaneseCharacters(text);
    
    // 最小1秒、句読点での間を考慮
    const baseTime = Math.max(1, characters / charactersPerSecond);
    const punctuationPauses = (text.match(/[。、！？]/g) || []).length * 0.3;
    
    return baseTime + punctuationPauses;
  }

  /**
   * 日本語文字数をカウント
   */
  private countJapaneseCharacters(text: string): number {
    // ひらがな、カタカナ、漢字、英数字を区別してカウント
    const hiragana = (text.match(/[\u3040-\u309F]/g) || []).length;
    const katakana = (text.match(/[\u30A0-\u30FF]/g) || []).length;
    const kanji = (text.match(/[\u4E00-\u9FAF]/g) || []).length;
    const alphanumeric = (text.match(/[a-zA-Z0-9]/g) || []).length;
    const symbols = (text.match(/[！？。、]/g) || []).length;
    
    // 日本語は英語より読み上げに時間がかかるため重み付け
    return hiragana * 1.0 + katakana * 1.0 + kanji * 1.2 + alphanumeric * 0.8 + symbols * 0.5;
  }

  /**
   * テキストの複雑度判定
   */
  private determineComplexity(text: string): TextAnalysis['complexity'] {
    const length = text.length;
    const lines = text.split('\n').length;
    const complexCharacters = (text.match(/[\u4E00-\u9FAF]/g) || []).length; // 漢字
    
    if (length <= 20 && lines <= 1 && complexCharacters <= 5) {
      return 'simple';
    } else if (length <= 50 && lines <= 2 && complexCharacters <= 15) {
      return 'medium';
    } else {
      return 'complex';
    }
  }

  /**
   * 推奨スタイルの決定
   */
  private recommendStyle(
    emotion: TextAnalysis['emotion'], 
    nanjTerms: string[], 
    complexity: TextAnalysis['complexity']
  ): string {
    // 感情ベースの推奨
    if (emotion === 'excited') return 'nanj-excited';
    if (emotion === 'happy' && nanjTerms.includes('草')) return 'nanj-草';
    if (emotion === 'sad') return 'nanj-sad';
    if (emotion === 'angry') return 'nanj-angry';

    // 特殊語句ベースの推奨
    if (nanjTerms.some(term => ['神試合', '完全試合', '化け物'].includes(term))) {
      return 'nanj-impact';
    }
    if (nanjTerms.some(term => ['優勝', '勝利', 'サヨナラ'].includes(term))) {
      return 'nanj-celebration';
    }
    if (nanjTerms.some(term => ['ささやき', '内緒', 'ボソッと'].includes(term))) {
      return 'nanj-whisper';
    }

    // 複雑度ベースの調整
    if (complexity === 'complex') {
      return 'nanj-default'; // 複雑なテキストは標準スタイルで読みやすく
    }

    return 'nanj-default';
  }

  /**
   * 自動改行処理
   */
  public autoWrapText(text: string, maxWidth: number, fontSize: number): string[] {
    // 日本語の文字幅を考慮した改行処理
    const averageCharWidth = fontSize * 0.6; // 日本語フォントの平均文字幅
    const maxCharsPerLine = Math.floor(maxWidth / averageCharWidth);
    
    const lines: string[] = [];
    const sentences = text.split(/[。！？]/);
    
    let currentLine = '';
    
    sentences.forEach((sentence, index) => {
      const fullSentence = sentence + (index < sentences.length - 1 ? 
        text.charAt(text.indexOf(sentence) + sentence.length) : '');
      
      if (currentLine.length + fullSentence.length <= maxCharsPerLine) {
        currentLine += fullSentence;
      } else {
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = fullSentence;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine.trim());
    }
    
    // 長すぎる行をさらに分割
    const finalLines: string[] = [];
    lines.forEach(line => {
      if (line.length <= maxCharsPerLine) {
        finalLines.push(line);
      } else {
        // 強制改行
        for (let i = 0; i < line.length; i += maxCharsPerLine) {
          finalLines.push(line.substring(i, i + maxCharsPerLine));
        }
      }
    });
    
    return finalLines.filter(line => line.length > 0);
  }

  /**
   * 特定語句の色分け情報を取得
   */
  public getColorMappings(text: string): Array<{ term: string; color: string; positions: number[] }> {
    const mappings: Array<{ term: string; color: string; positions: number[] }> = [];
    
    Object.entries(this.nanjConfig.colorMappings).forEach(([term, color]) => {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      let match;
      const positions: number[] = [];
      
      while ((match = regex.exec(text)) !== null) {
        positions.push(match.index);
      }
      
      if (positions.length > 0) {
        mappings.push({ term, color, positions });
      }
    });
    
    return mappings;
  }

  /**
   * テキストの統計情報を取得
   */
  public getTextStatistics(text: string): {
    totalChars: number;
    hiragana: number;
    katakana: number;
    kanji: number;
    alphanumeric: number;
    punctuation: number;
    nanjTermCount: number;
    estimatedComplexity: number; // 0-1の値
  } {
    const hiragana = (text.match(/[\u3040-\u309F]/g) || []).length;
    const katakana = (text.match(/[\u30A0-\u30FF]/g) || []).length;
    const kanji = (text.match(/[\u4E00-\u9FAF]/g) || []).length;
    const alphanumeric = (text.match(/[a-zA-Z0-9]/g) || []).length;
    const punctuation = (text.match(/[！？。、]/g) || []).length;
    const nanjTerms = this.detectNanjTerms(text);
    
    // 複雑度を0-1で算出
    const complexityFactors = {
      length: Math.min(text.length / 100, 1),
      kanjiRatio: kanji / text.length,
      nanjDensity: nanjTerms.length / text.length * 10
    };
    
    const estimatedComplexity = (
      complexityFactors.length * 0.4 + 
      complexityFactors.kanjiRatio * 0.4 + 
      complexityFactors.nanjDensity * 0.2
    );
    
    return {
      totalChars: text.length,
      hiragana,
      katakana,
      kanji,
      alphanumeric,
      punctuation,
      nanjTermCount: nanjTerms.length,
      estimatedComplexity: Math.min(estimatedComplexity, 1)
    };
  }
}