# Scripts

## 実行スクリプト

### `generate-daily-audio.mjs`
指定日付の実際のプロ野球情報に基づく60個の音声ファイル生成

```bash
# 今日の日付で実行
node scripts/generate-daily-audio.mjs

# 昨日の日付で実行
node scripts/generate-daily-audio.mjs --date=yesterday

# 特定日付を指定
node scripts/generate-daily-audio.mjs --date=2025-09-10

# ヘルプ表示
node scripts/generate-daily-audio.mjs --help
```

### `check-voicevox.mjs`
VoiceVox API接続確認

```bash
node scripts/check-voicevox.mjs
```

### `demo-video-generation.ts`
完全な動画生成デモ（TypeScript版）

```bash
npm test
```

## 実行順序

1. VoiceVoxアプリケーション起動
2. `check-voicevox.mjs` でAPI確認
3. `generate-daily-audio.mjs` で指定日付の音声生成
4. `demo-video-generation.ts` でフル動画生成

## 日付指定オプション

- `--date=today` - 今日の日付（デフォルト）
- `--date=yesterday` - 昨日の日付
- `--date=YYYY-MM-DD` - 特定の日付（例：2025-09-10）

## 出力ファイル

音声ファイルは以下の場所に保存されます：
```
audio/nanj-YYYY-MM-DD/
├── topic1_comment1_zundamon-normal_YYYYMMDD.wav
├── topic1_comment2_zundamon-amaama_YYYYMMDD.wav
...
└── topic3_comment20_metan-amaama_YYYYMMDD.wav
```

各議題20個ずつ、合計60個の音声ファイルが生成されます。
