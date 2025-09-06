# Scripts

## 実行スクリプト

### `generate-full-pipeline.mjs` 🚀
**音声→字幕→動画の完全自動化パイプライン**（推奨）

```bash
# 完全自動化実行
node scripts/generate-full-pipeline.mjs --sites

# 素材使用の高品質版
node scripts/generate-full-pipeline.mjs --sites --assets=assets

# 特定日付で実行
node scripts/generate-full-pipeline.mjs --date=2025-09-10 --sites
```

### `generate-daily-audio.mjs`
指定日付の実際のプロ野球情報に基づく60個の音声ファイル生成（1.5倍速）

```bash
# 今日の日付で実行（サンプルコメント使用）
node scripts/generate-daily-audio.mjs

# 昨日の日付で実行
node scripts/generate-daily-audio.mjs --date=yesterday

# 特定日付を指定
node scripts/generate-daily-audio.mjs --date=2025-09-10

# 指定3サイトの情報を使用
node scripts/generate-daily-audio.mjs --sites --date=today

# ヘルプ表示
node scripts/generate-daily-audio.mjs --help
```

### `generate-subtitles-batch.mjs` 🎬
音声ファイルから字幕画像を一括自動生成（感情分析対応）

```bash
# 字幕画像生成
node scripts/generate-subtitles-batch.mjs

# 特定日付で実行
node scripts/generate-subtitles-batch.mjs --date=2025-09-10
```

### `generate-video-batch.mjs` 🎥
音声+字幕から動画ファイルを一括自動生成（MoviePy使用）

```bash
# 動画生成
node scripts/generate-video-batch.mjs

# 背景タイプ指定
node scripts/generate-video-batch.mjs --background=night

# 特定日付で実行
node scripts/generate-video-batch.mjs --date=2025-09-10
```

### `fetch-nanj-sites.mjs` 
指定3サイト（nanjstu, yakiusoku, nanjpride）から情報取得

```bash
# 指定3サイトから今日の情報を取得
node scripts/fetch-nanj-sites.mjs --sites

# 昨日の3サイト情報を取得
node scripts/fetch-nanj-sites.mjs --date=yesterday --sites

# 特定日付の3サイト情報を取得
node scripts/fetch-nanj-sites.mjs --date=2025-09-10 --sites
```

### `check-voicevox.mjs`
VoiceVox API接続確認

```bash
node scripts/check-voicevox.mjs
```

### `demo-video-generation.ts`
従来の動画生成デモ（TypeScript版）

```bash
npm test
```

## 指定3サイト

システムでは以下の3サイトを対象としています：

1. **nanjstu** - http://blog.livedoor.jp/nanjstu/
   - なんJスタジアム@なんJまとめ
   - 野球の実況まとめ・コメント抽出

2. **yakiusoku** - http://blog.livedoor.jp/yakiusoku/
   - やきう速報
   - プロ野球速報・まとめ・コメント収集

3. **nanjpride** - https://nanjpride.blog.jp/
   - なんJ PRIDE
   - 野球関連のなんJ語コメント・反応まとめ

## 実行フロー

### 完全自動化フロー（推奨）🚀
1. VoiceVoxアプリケーション起動
2. `check-voicevox.mjs` でAPI確認
3. **`generate-full-pipeline.mjs --sites`** で完全自動化実行
   - 3サイト情報取得
   - 音声生成（1.5倍速）
   - 字幕生成（感情分析）
   - 動画生成（素材活用）

### 個別実行フロー
1. VoiceVoxアプリケーション起動
2. `generate-daily-audio.mjs --sites` で音声生成
3. `generate-subtitles-batch.mjs` で字幕生成
4. `generate-video-batch.mjs` で動画生成

## オプション

### 日付指定
- `--date=today` - 今日の日付（デフォルト）
- `--date=yesterday` - 昨日の日付
- `--date=YYYY-MM-DD` - 特定の日付（例：2025-09-10）

### 情報源指定
- `--sites` - 指定3サイトの情報を使用
- （なし） - サンプルコメントを使用

## 出力ファイル

### 音声ファイル（1.5倍速）
```
audio/nanj-YYYY-MM-DD/
├── theme1_comment1_zundamon-normal_YYYYMMDD.wav
├── theme1_comment2_zundamon-amaama_YYYYMMDD.wav
...
└── theme3_comment20_metan-amaama_YYYYMMDD.wav
```

### 字幕ファイル（感情分析対応）
```
subtitles/nanj-YYYY-MM-DD/
├── theme1_comment1_zundamon-normal_YYYYMMDD_subtitle.png
├── theme1_comment2_zundamon-amaama_YYYYMMDD_subtitle.png
...
├── nanj-subtitles-YYYY-MM-DD.vtt
```

### 動画ファイル（高品質）
```
videos/nanj-YYYY-MM-DD/
├── theme1_comment1_zundamon-normal_YYYYMMDD_enhanced.mp4
├── theme1_comment2_zundamon-amaama_YYYYMMDD_enhanced.mp4
...
└── theme3_comment20_metan-amaama_YYYYMMDD_enhanced.mp4
```

### サイト分析結果
```
output/nanj-sites-YYYY-MM-DD/
└── nanj-analysis-result.json
```

各独立テーマ20個ずつ、合計60個の完成動画ファイルが生成されます。
