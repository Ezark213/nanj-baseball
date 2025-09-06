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
3つの独立したテーマで各20個ずつ、実際の情報に基づく：

1. **テーマ1** (20個) - 指定3サイトで最も話題の内容
2. **テーマ2** (20個) - 指定3サイトで話題の異なる内容  
3. **テーマ3** (20個) - 指定3サイトで話題のさらに別の内容

## 🎤 音声システム

### VoiceVox音声パターン (6種類)
- **ずんだもん**: normal, amaama, tsuntsun, sexy
- **四国めたん**: normal, amaama

### 音声ファイル生成
- **60個の音声ファイル**を自動生成
- **保存場所**: `audio/nanj-{date}/`
- **平均サイズ**: 180KB/ファイル

## 📁 プロジェクト構成

```
nanj-baseball/
├── scripts/                # 実行スクリプト
│   ├── generate-daily-audio.mjs     # 日次音声生成
│   ├── check-voicevox.mjs          # API接続確認
│   └── demo-video-generation.ts    # フル動画デモ
├── src/
│   ├── voice/              # VoiceVox音声システム
│   ├── subtitle/           # 字幕生成システム
│   ├── video/              # 動画合成システム
│   └── integration/        # 統合パイプライン
├── python/                 # Python動画処理
├── audio/                  # 生成音声ファイル
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

# Python依存関係インストール
pip install -r python/requirements.txt
```

### 2. システム確認
```bash
# VoiceVox接続確認
node scripts/check-voicevox.mjs
```

### 3. 任意日付の音声生成
```bash
# 今日の日付で自動実行
node scripts/generate-daily-audio.mjs

# 特定日付を指定
node scripts/generate-daily-audio.mjs --date=2025-09-10
```

### 4. フル動画生成
```bash
# 完全自動化テスト
npm test
```

## 📊 システム機能

### ✅ 自動化機能
- **リアルタイム情報取得**: 指定日付の最新野球データ
- **60個のコメント生成**: 創作ではなく実際の情報ベース
- **完全音声自動化**: 100%成功率での音声ファイル生成
- **字幕生成システム**: なんJ語専用スタイル
- **動画合成パイプライン**: Python + MoviePy統合

### 📈 技術仕様
- **処理能力**: 15-30秒/動画
- **出力品質**: 1920x1080, 30fps, MP4
- **音声品質**: 高品質WAVファイル
- **バッチ処理**: 並列処理対応
- **日付対応**: 任意の日付指定可能

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
# 昨日の試合で音声生成
node scripts/generate-daily-audio.mjs --date=yesterday

# 今週の試合まとめ
node scripts/generate-weekly-batch.mjs

# 特定チーム専用
node scripts/generate-daily-audio.mjs --team=giants
```

## 📖 詳細ドキュメント

- [システム設計書](docs/system-overview.md)
- [コメント生成プロンプト](docs/nanj_comment_generator_prompt.md)
- [スクリプト使用方法](scripts/README.md)
- [実行例・デモレポート](docs/DEMO_REPORT_2025-09-06.md)

---

**🎬 指定した任意の日付の最新プロ野球情報から音声ファイルを自動生成！**
