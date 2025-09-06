# Scripts

## 実行スクリプト

### `generate-60-audio-files.mjs`
2025年9月6日の実際のプロ野球情報に基づく60個の音声ファイル生成

```bash
node scripts/generate-60-audio-files.mjs
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
3. `generate-60-audio-files.mjs` で音声生成
4. `demo-video-generation.ts` でフル動画生成