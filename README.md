# 🎬 なんJ野球動画自動生成システム

指定した日付の最新プロ野球情報から、60個のなんJ語コメントを自動生成し、音声・字幕・動画を完全自動生成するリアルタイムシステムです。

## 🎯 システム概要

```
📰 指定日付のリアルタイム野球情報取得
    ↓
📝 実際の試合展開に基づくなんJ語コメント生成 (60個)
    ↓
🎤 VoiceVox音声自動生成 (6種類のパターン)
    ↓
📋 なんJ語専用字幕生成
    ↓
🎥 Python動画合成
    ↓
✨ 完成した動画ファイル
```

## 🏟️ システムの特徴

### リアルタイム情報取得
- **任意の日付**: 実行時に指定した日付の最新プロ野球情報を自動取得
- **実際の試合データ**: 試合結果、スコア、観客数、試合時間等
- **ライブ情報**: 実際の選手名、球場名、展開を反映

### 自動コメント生成 (60個)
3つの独立したテーマで各20個ずつ、指定3サイトの実際の情報に基づく：

1. **独立テーマ1** (20個) - サイト共通の最新話題
2. **独立テーマ2** (20個) - 独自の分析・視点による話題  
3. **独立テーマ3** (20個) - 特別な出来事・反応による話題

**※各テーマは完全に独立しており、重複しない多様な内容を提供**

## 🎤 音声システム

### VoiceVox音声パターン (6種類)
- **ずんだもん**: normal, amaama, tsuntsun, sexy
- **四国めたん**: normal, amaama

### 音声ファイル生成
- **60個の音声ファイル**を自動生成 (**1.5倍速**)
- **保存場所**: `audio/nanj-{date}/`
- **平均サイズ**: 180KB/ファイル
- **音声速度**: 1.5倍速で高速再生対応

## 📁 プロジェクト構成

```
nanj-baseball/
├── scripts/                # 実行スクリプト
│   ├── generate-daily-audio.mjs     # 日次音声生成 (1.5倍速)
│   ├── generate-subtitles-batch.mjs # 字幕画像一括生成
│   ├── generate-video-batch.mjs     # 動画一括生成 (MoviePy)
│   ├── generate-full-pipeline.mjs   # 完全自動化パイプライン
│   ├── fetch-nanj-sites.mjs        # 指定3サイト情報取得
│   ├── check-voicevox.mjs          # API接続確認
│   └── demo-video-generation.ts    # フル動画デモ
├── src/
│   ├── voice/              # VoiceVox音声システム
│   ├── subtitle/           # 字幕生成システム
│   ├── video/              # 動画合成システム
│   └── integration/        # 統合パイプライン
├── python/                 # Python動画処理
├── audio/                  # 生成音声ファイル
├── subtitles/              # 生成字幕ファイル
├── videos/                 # 生成動画ファイル
├── assets/                 # 素材ファイル (背景/GIF/音楽)
├── config/                 # 設定ファイル
├── docs/                   # ドキュメント
└── README.md
```

## 🚀 クイックスタート

### 1. 必要な環境
```bash
# VoiceVoxアプリケーション起動
# http://localhost:50021 で確認

# Node.js依存関係インストール  
npm install

# Python依存関係インストール (動画生成用)
pip install moviepy numpy

# Canvas依存関係インストール (字幕生成用)
npm install canvas
```

### 2. システム確認
```bash
# VoiceVox接続確認
node scripts/check-voicevox.mjs
```

### 3. 指定3サイト情報取得
```bash
# 指定3サイト情報を取得・分析
node scripts/fetch-nanj-sites.mjs --sites

# 特定日付の3サイト情報取得
node scripts/fetch-nanj-sites.mjs --date=2025-09-10 --sites
```

### 4. 任意日付の音声生成 (1.5倍速)
```bash
# 今日の日付で自動実行
node scripts/generate-daily-audio.mjs

# 特定日付を指定
node scripts/generate-daily-audio.mjs --date=2025-09-10

# 指定3サイトの情報を使用
node scripts/generate-daily-audio.mjs --sites
```

### 5. 完全自動化パイプライン 🚀
```bash
# 音声→字幕→動画を一括自動生成
node scripts/generate-full-pipeline.mjs

# 既存素材を使った高品質版
node scripts/generate-full-pipeline.mjs --sites --assets=assets

# 特定日付で実行
node scripts/generate-full-pipeline.mjs --date=2025-09-10 --sites
```

## 📊 システム機能

### ✅ 自動化機能
- **指定3サイト情報取得**: nanjstu, yakiusoku, nanjpride対応
- **3つの独立テーマ生成**: 各20個ずつ、多様性重視の重複なしコンテンツ
- **1.5倍速音声生成**: 高速再生対応の音声ファイル (VoiceVox)
- **感情分析字幕生成**: なんJ語感情に応じた動的スタイリング
- **素材活用動画合成**: 背景・GIF・BGM使用の高品質動画
- **完全パイプライン**: 音声→字幕→動画の一括自動生成

### 📈 技術仕様
- **処理能力**: 60個のコンテンツを一括自動生成
- **出力品質**: 1920x1080, 30fps, H.264/AAC, MP4
- **音声品質**: 高品質WAVファイル (1.5倍速, 6種類の音声パターン)
- **字幕品質**: Canvas生成PNG、感情分析対応スタイリング
- **素材対応**: 背景画像・動画、GIFアニメ、BGM自動合成
- **バッチ処理**: 完全並列処理対応、エラーハンドリング内蔵

## 🎯 実用性

### 即座に可能
- YouTube動画制作（毎日更新）
- SNS投稿用短編動画
- ライブ配信補助
- デイリーまとめ動画

### 商業利用可能
- なんJ語動画自動生成SaaS
- スポーツマーケティング
- 教育コンテンツ作成
- 自動ニュース動画

## 💡 使用例

```bash
# 完全自動化パイプライン (推奨)
node scripts/generate-full-pipeline.mjs --sites

# 昨日の試合で完全自動化
node scripts/generate-full-pipeline.mjs --date=yesterday --sites

# 素材を使った高品質動画生成
node scripts/generate-full-pipeline.mjs --assets=my_assets --sites

# 個別実行も可能
node scripts/generate-daily-audio.mjs --date=yesterday
node scripts/generate-subtitles-batch.mjs --date=yesterday  
node scripts/generate-video-batch.mjs --date=yesterday
```

## 📖 詳細ドキュメント

- [システム設計書](docs/system-overview.md)
- [コメント生成プロンプト](docs/nanj_comment_generator_prompt.md)
- [スクリプト使用方法](scripts/README.md)
- [実行例・デモレポート](docs/DEMO_REPORT_2025-09-06.md)

---

**🎬 指定した任意の日付の最新プロ野球情報から、音声・字幕・動画を完全自動生成！YouTube投稿Ready！**
