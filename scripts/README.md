# Scripts

## 実行スクリプト

### `generate-daily-audio.mjs`
指定日付の実際のプロ野球情報に基づく60個の音声ファイル生成

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

### `fetch-nanj-sites.mjs` 🆕
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
完全な動画生成デモ（TypeScript版）

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

### 標準フロー（推奨）
1. VoiceVoxアプリケーション起動
2. `check-voicevox.mjs` でAPI確認
3. `fetch-nanj-sites.mjs --sites` で3サイトの情報取得
4. `generate-daily-audio.mjs --sites` で音声生成
5. `demo-video-generation.ts` でフル動画生成

### 簡単フロー
1. VoiceVoxアプリケーション起動
2. `generate-daily-audio.mjs` でサンプル音声生成

## オプション

### 日付指定
- `--date=today` - 今日の日付（デフォルト）
- `--date=yesterday` - 昨日の日付
- `--date=YYYY-MM-DD` - 特定の日付（例：2025-09-10）

### 情報源指定
- `--sites` - 指定3サイトの情報を使用
- （なし） - サンプルコメントを使用

## 出力ファイル

### 音声ファイル
```
audio/nanj-YYYY-MM-DD/
├── topic1_comment1_zundamon-normal_YYYYMMDD.wav
├── topic1_comment2_zundamon-amaama_YYYYMMDD.wav
...
└── topic3_comment20_metan-amaama_YYYYMMDD.wav
```

### サイト分析結果
```
output/nanj-sites-YYYY-MM-DD/
└── nanj-analysis-result.json
```

各議題20個ずつ、合計60個の音声ファイルが生成されます。
