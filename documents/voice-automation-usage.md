# 音声自動化システム 使用方法

## 概要

VoiceVoxを活用した音声自動生成システムの使用方法を説明します。

## 前提条件

1. **VoiceVox のインストール**
   ```bash
   # VoiceVoxをダウンロードしてインストール
   # https://voicevox.hiroshiba.jp/
   ```

2. **VoiceVox サーバーの起動**
   ```bash
   # VoiceVoxアプリケーションを起動
   # または、VoiceVox Engineを直接起動
   # デフォルトで http://localhost:50021 でAPIが利用可能
   ```

## 基本的な使用方法

### 1. 簡易使用法

```typescript
import { quickGenerate } from '../src/voice/index.js';

// 単一音声生成
const audioFiles = await quickGenerate('こんにちは、ずんだもんなのだ！');
console.log('生成された音声:', audioFiles[0]);

// 複数パターン生成
const multipleFiles = await quickGenerate(
  'ホームランだのだ！', 
  { multiple: true, count: 3 }
);
console.log('生成された音声:', multipleFiles);
```

### 2. 詳細制御

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline({
  voicevoxUrl: 'http://localhost:50021',
  audioOutputDir: './audio',
  autoCleanup: {
    enabled: true,
    maxFiles: 1000,
    interval: 60 * 60 * 1000 // 1時間ごとにクリーンアップ
  }
});

// 単一音声生成
const result = await pipeline.generateSingleVoice('野球の試合が始まるのだ！', {
  speedScale: 1.1,
  pitchScale: 0.1,
  preferredPatterns: ['zundamon-normal']
});

if (result.success) {
  console.log('音声ファイル:', result.results[0].filePath);
  console.log('使用パターン:', result.results[0].pattern.character);
}

pipeline.shutdown();
```

### 3. 複数パターンの一括生成

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline();

const result = await pipeline.generateMultipleVoices(
  'すごいプレイなのだ！',
  5 // 5つのパターンで生成
);

console.log(`${result.results.length}個の音声を生成`);
result.results.forEach((r, index) => {
  if (r.success) {
    console.log(`${index + 1}: ${r.pattern.character}(${r.pattern.style}) - ${r.filePath}`);
  }
});

pipeline.shutdown();
```

## 高度な使用方法

### バッチ処理

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline();

const comments = [
  'ストライク！',
  'ボール！', 
  'アウト！',
  'セーフ！',
  'ホームラン！'
];

// バッチ処理で一括生成
const results = await pipeline.generateBatch(comments, {
  multiplePatterns: true,
  patternCount: 3,
  concurrency: 2,
  generationOptions: {
    speedScale: 1.2,
    volumeScale: 1.1
  }
});

console.log(`${results.length}件のコメントを処理完了`);
pipeline.shutdown();
```

### 条件付きパターン選択

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline();

// 朝の挨拶（甘い声）
const morningResult = await pipeline.generateSingleVoice(
  'おはようなのだ！', 
  { preferredPatterns: ['zundamon-amaama', 'metan-amaama'] }
);

// 興奮時（ツンツン）
const excitedResult = await pipeline.generateSingleVoice(
  'やったー！勝ったのだ！',
  { preferredPatterns: ['zundamon-tsuntsun'] }
);

// 夜の挨拶（ささやき）
const nightResult = await pipeline.generateSingleVoice(
  'おやすみなのだ...',
  { preferredPatterns: ['zundamon-sasayaki', 'metan-sasayaki'] }
);

pipeline.shutdown();
```

## パターン管理

### 利用可能なパターンを確認

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline();
const patternManager = pipeline.getPatternManager();

// 利用可能なパターン一覧
const patterns = patternManager.getAvailablePatterns();
console.log('利用可能なパターン:');
patterns.forEach(pattern => {
  console.log(`- ${pattern.character}: ${pattern.style} (ID: ${pattern.id})`);
});

// 特定パターンの情報
const zundamonNormal = patternManager.getPatternById('zundamon-normal');
console.log('ずんだもんノーマル:', zundamonNormal);

pipeline.shutdown();
```

### パターンの動的制御

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline();
const patternManager = pipeline.getPatternManager();

// パターンを一時的に無効化
patternManager.disablePattern('zundamon-sexy');

// 音声生成（セクシーボイスは使用されない）
const result = await pipeline.generateSingleVoice('テストメッセージ');

// パターンを再有効化
patternManager.enablePattern('zundamon-sexy');

pipeline.shutdown();
```

## ファイル管理

### 生成された音声ファイルの管理

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline();
const fileManager = pipeline.getFileManager();

// 音声生成
await pipeline.generateSingleVoice('ファイル管理のテストなのだ！');

// ファイル一覧取得
const files = fileManager.getAudioFiles({
  character: 'ずんだもん',
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc'
});

console.log('最新の音声ファイル:');
files.forEach(file => {
  console.log(`${file.filename} - ${file.character}(${file.pattern})`);
});

// ファイル検索
const searchResults = fileManager.searchAudioFiles('テスト');
console.log(`検索結果: ${searchResults.length}件`);

pipeline.shutdown();
```

### 自動クリーンアップ

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline({
  autoCleanup: {
    enabled: true,
    maxAge: 24 * 60 * 60 * 1000, // 24時間以上古いファイルを削除
    maxFiles: 500,               // 500ファイルを超えたら古いものを削除
    maxSize: 100 * 1024 * 1024,  // 100MBを超えたら削除
    interval: 30 * 60 * 1000     // 30分ごとにチェック
  }
});

// パイプラインが動作中、自動的にクリーンアップが実行されます
```

## システム監視

### システム状態の確認

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline();

const status = await pipeline.getSystemStatus();

console.log('=== システム状態 ===');
console.log('VoiceVox接続:', status.voicevox.isConnected);
console.log('VoiceVoxバージョン:', status.voicevox.version);
console.log('利用可能スピーカー数:', status.voicevox.speakers);

console.log('パターン数:', status.patterns.available);
console.log('選択モード:', status.patterns.config);

console.log('総音声ファイル数:', status.audio.totalFiles);
console.log('ディスク使用量:', status.audio.diskUsage);

pipeline.shutdown();
```

### VoiceVox接続確認

```typescript
import { checkSystemHealth } from '../src/voice/index.js';

const isHealthy = await checkSystemHealth();
if (isHealthy) {
  console.log('✅ システム正常');
} else {
  console.log('❌ VoiceVox接続エラー');
}
```

## エラーハンドリング

### 接続エラー時の対処

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline();

try {
  const result = await pipeline.generateSingleVoice('テストメッセージ');
  
  if (!result.success) {
    console.error('音声生成失敗:', result.error);
    
    // フォールバック: テキストファイルが作成される場合がある
    if (result.results[0]?.filePath?.endsWith('.txt')) {
      console.log('テキストファイルにフォールバック:', result.results[0].filePath);
    }
  }
} catch (error) {
  console.error('パイプラインエラー:', error);
} finally {
  pipeline.shutdown();
}
```

### リトライ処理

```typescript
import { VoiceAutomationPipeline } from '../src/voice/index.js';

const pipeline = new VoiceAutomationPipeline();

// システム設定でリトライ回数が設定される（デフォルト3回）
// 個別に制御する場合は、エラー時に再試行

async function retryGeneration(text: string, maxRetries: number = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await pipeline.generateSingleVoice(text);
      if (result.success) {
        return result;
      }
      
      console.log(`リトライ ${i + 1}/${maxRetries}: ${result.error}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      console.log(`リトライ ${i + 1}/${maxRetries} エラー:`, error);
    }
  }
  
  throw new Error('最大リトライ回数に達しました');
}

try {
  const result = await retryGeneration('リトライテスト');
  console.log('成功:', result.results[0].filePath);
} catch (error) {
  console.error('最終的に失敗:', error);
} finally {
  pipeline.shutdown();
}
```

## ベストプラクティス

### 1. リソース管理
- パイプライン使用後は必ず `shutdown()` を呼ぶ
- 自動クリーンアップを有効にして、ディスク容量を管理する

### 2. パフォーマンス
- バッチ処理時は適切な同時実行数を設定する
- 長いテキストは分割して処理する
- キャッシュ機能を活用する

### 3. エラー処理
- VoiceVox接続エラーに備えてフォールバック処理を実装する
- 重要な処理にはリトライ機能を実装する

### 4. 設定管理
- プロジェクトに応じて音声パターンをカスタマイズする
- 環境に応じてVoiceVoxのURL・タイムアウトを調整する

## トラブルシューティング

### よくある問題

1. **VoiceVox接続エラー**
   - VoiceVoxが起動しているか確認
   - ファイアウォール設定を確認
   - ポート50021が使用可能か確認

2. **音声生成が遅い**
   - VoiceVoxのハードウェア要件を確認
   - 同時実行数を調整
   - キャッシュ設定を確認

3. **ディスク容量不足**
   - 自動クリーンアップを有効にする
   - maxSizeやmaxFilesを調整
   - 手動でファイルを削除

4. **特定のパターンが使用されない**
   - パターンが有効になっているか確認
   - 条件付き選択ルールを確認
   - VoiceVoxで該当スピーカーが利用可能か確認