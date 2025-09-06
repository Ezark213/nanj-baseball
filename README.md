# 🏈 なんJ野球動画自動生成システム

野球系なんJ語コメントから動画を自動生成するシステムです。VoiceVox音声自動化システムを搭載し、14種類の多彩な音声パターンでコメントを音声化できます。

## 📋 ワークフロー

```
1. プロンプトでセリフ生成
   ↓
2. VoiceVox音声自動化システムで多彩な音声生成
   ├─ ずんだもん（8パターン）
   └─ 四国めたん（6パターン）
   ↓
3. 何かしらの手段で字幕生成
   ↓
4. 動画生成
```

## 🎯 プロジェクト概要

このプロジェクトは、プロ野球に関するなんJ語スタイルのコメントを自動生成し、音声合成・字幕配置・動画合成まで一貫して行う自動化システムです。

## 🚀 機能

- **なんJ語コメント自動生成**: AIプロンプトによる自然ななんJ語コメント生成
- **多彩な音声合成**: VoiceVox連携による14種類の音声パターン
  - ずんだもん: ノーマル、あまあま、ツンツン、セクシー、ささやき、ヒソヒソ、ヘロヘロ、なみだめ
  - 四国めたん: あまあま、ノーマル、ツンツン、セクシー、ささやき、ヒソヒソ
- **インテリジェント音声選択**: 時間帯・感情・コンテンツに応じた自動パターン選択
- **バッチ処理**: 複数コメントの一括音声生成
- **字幕自動配置**: 動画内への字幕の最適配置
- **動画自動合成**: 背景動画と音声・字幕の自動合成

## 📁 プロジェクト構成

```
nanj-baseball/
├── README.md                           # このファイル
├── CLAUDE.md                           # AI コーディングルール
├── nanj_comment_generator_prompt.md    # なんJ語コメント生成プロンプト
├── src/
│   └── voice/                         # VoiceVox音声自動化システム
│       ├── client/                    # VoiceVox APIクライアント
│       ├── patterns/                  # 音声パターン管理
│       ├── generator/                 # 音声生成エンジン
│       ├── manager/                   # 音声ファイル管理
│       └── VoiceAutomationPipeline.ts # メインパイプライン
├── config/
│   └── voice-patterns.json           # 音声パターン設定
├── documents/                         # システム設計書・使用方法
├── examples/                          # サンプル実行ファイル
├── audio/                             # 生成された音声ファイル
├── videos/                            # 完成動画
└── templates/                         # 動画テンプレート
```

## 🛠️ セットアップ

### 必要な環境
- **Node.js 18+** (TypeScript音声自動化システム用)
- **VoiceVox** (音声合成エンジン)
- **Python 3.9+** (動画処理用、予定)
- **FFmpeg** (動画処理)

### VoiceVox セットアップ
1. [VoiceVox公式サイト](https://voicevox.hiroshiba.jp/)からダウンロード・インストール
2. VoiceVoxアプリケーションを起動（APIサーバーが http://localhost:50021 で起動）

### インストール
```bash
# リポジトリのクローン
git clone https://github.com/Ezark213/nanj-baseball.git
cd nanj-baseball

# TypeScript環境のセットアップ
npm install typescript ts-node @types/node

# 音声自動化システムのテスト実行
npx ts-node examples/voice-automation-example.ts
```

## 📝 使用方法

### Step 1: セリフ生成
1. `nanj_comment_generator_prompt.md` の内容をAI（ChatGPT、Claude等）に入力
2. 生成されたなんJ語コメントを保存

### Step 2: 音声生成（自動化システム使用）

#### 簡単な使用方法
```typescript
import { quickGenerate } from './src/voice/index.js';

// 単一音声生成（自動パターン選択）
const audioFiles = await quickGenerate('ホームランなのだ！');

// 複数パターン生成
const multipleFiles = await quickGenerate(
  'すごいプレイなのだ！', 
  { multiple: true, count: 3 }
);
```

#### 詳細制御
```typescript
import { VoiceAutomationPipeline } from './src/voice/index.js';

const pipeline = new VoiceAutomationPipeline();

// 条件付き音声生成
const result = await pipeline.generateSingleVoice('野球の試合開始なのだ！', {
  speedScale: 1.1,
  preferredPatterns: ['zundamon-tsuntsun', 'metan-amaama']
});

pipeline.shutdown();
```

#### バッチ処理
```typescript
const comments = ['ストライク！', 'ボール！', 'ホームラン！'];
const results = await pipeline.generateBatch(comments, {
  multiplePatterns: true,
  patternCount: 2
});
```

### Step 3: 字幕生成
- 自動字幕配置システム（開発予定）
- 手動での字幕配置

### Step 4: 動画生成
- 背景動画 + 音声 + 字幕 → 最終動画
- 自動化スクリプトによる一括処理（開発予定）

## 🎵 音声パターンの特徴

### ずんだもん（8パターン）
- **ノーマル**: 標準的な声
- **あまあま**: 甘い話し方
- **ツンツン**: ツンデレな話し方
- **セクシー**: 色っぽい声
- **ささやき**: ささやき声
- **ヒソヒソ**: より小さなささやき
- **ヘロヘロ**: 疲れた声
- **なみだめ**: 泣きそうな声

### 四国めたん（6パターン）
- **あまあま**: 甘い話し方
- **ノーマル**: 標準的な声
- **ツンツン**: ツンデレな話し方
- **セクシー**: 色っぽい声
- **ささやき**: ささやき声
- **ヒソヒソ**: より小さなささやき

## 🧠 インテリジェント選択機能

### 時間帯による自動選択
- **朝（6-11時）**: あまあま、ノーマル
- **昼（12-17時）**: ノーマル、ツンツン
- **夜（18-23時）**: ささやき、ヒソヒソ
- **深夜（0-5時）**: ヒソヒソ、ささやき

### 感情による自動選択
- **嬉しい・楽しい**: あまあま系
- **興奮**: ツンツン、ノーマル
- **悲しい**: なみだめ、ヘロヘロ
- **怒り**: ツンツン系

### コンテンツによる自動選択
- **野球関連**: ノーマル、ツンツン
- **ホームラン**: あまあま系
- **挨拶系**: 時間帯に応じて自動選択

## 🎨 なんJ語コメントの特徴

- **語尾**: 「ンゴ」「ニキ」「やで」「やろ」
- **感情表現**: 「草」「草生える」「ファッ？」
- **一人称**: 「ワイ」
- **チーム愛称**: 虎（阪神）、鷹（ソフトバンク）、燕（ヤクルト）等
- **野球用語**: 打率、OPS、WAR、QS等となんJ語の組み合わせ

## 🔧 技術スタック

- **AI**: ChatGPT/Claude（コメント生成）
- **音声合成**: VoiceVox API（ずんだもん・四国めたん）
- **音声自動化**: TypeScript + Node.js
- **動画処理**: Python + MoviePy + FFmpeg（予定）
- **字幕処理**: PIL/Pillow（予定）
- **パターン管理**: JSON設定ファイル
- **ファイル管理**: 自動キャッシュ・クリーンアップ機能

## 📊 開発ロードマップ

### Phase 1: 基本機能（✅ 完了）
- [x] なんJ語コメント生成プロンプト
- [x] VoiceVox音声自動化システム
- [x] 14種類の多彩な音声パターン
- [x] インテリジェント音声選択機能
- [x] バッチ処理システム
- [x] 自動ファイル管理・クリーンアップ

### Phase 2: 動画生成機能
- [ ] 基本的な動画生成スクリプト
- [ ] 音声・字幕同期機能
- [ ] 字幕自動配置アルゴリズム
- [ ] ワンクリック動画生成

### Phase 3: 高度化
- [ ] リアルタイムプレビュー
- [ ] Webインターフェース
- [ ] クラウド処理対応
- [ ] 音声感情分析連携

## 🎯 サンプル出力

### 生成されるコメント例：
```
ワイの推しチーム、今日も敗戦処理で草
大谷ニキの打率.300超えてて草生える
虎さん、今年もAクラス厳しそうやなぁ
```

### 音声ファイル生成例：
```
audio/
├── zundamon/
│   ├── zundamon-normal_12ab34cd_2024-01-15T10-30-00.wav
│   ├── zundamon-tsuntsun_56ef78gh_2024-01-15T10-31-15.wav
│   └── zundamon-amaama_90ij12kl_2024-01-15T10-32-30.wav
└── metan/
    ├── metan-normal_34mn56op_2024-01-15T10-33-45.wav
    └── metan-sasayaki_78qr90st_2024-01-15T10-35-00.wav
```

### システム動作例：
```
🎤 音声自動化システム実行例

1. テキスト: "ホームランなのだ！"
   → 感情分析: 興奮 → パターン選択: zundamon-tsuntsun
   → 生成時間: 1.2秒 → ファイル保存

2. テキスト: "おやすみなのだ..."
   → 時間帯: 22:30 → パターン選択: zundamon-sasayaki
   → 生成時間: 0.8秒 → ファイル保存

3. バッチ処理: 5件のコメント
   → 並列処理 → 4件成功、1件リトライ → 総時間: 3.5秒
```

## ⚠️ 注意事項

- コメントは創作・再構成であり、実在の投稿をそのまま使用していません
- 著作権に配慮した表現を心がけています
- 誹謗中傷や攻撃的な内容は含まれません
- **VoiceVox利用時は各キャラクターの利用規約を遵守してください**
- 音声ファイルは自動的にクリーンアップされますが、必要に応じて手動管理してください
- 大量の音声生成時はディスク容量にご注意ください

## 🤝 コントリビュート

このプロジェクトへの貢献を歓迎します！

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 📚 詳細ドキュメント

- [VoiceVox音声自動化システム設計書](documents/voice-automation-system.md)
- [システム使用方法・詳細](documents/voice-automation-usage.md)
- [サンプル実行ファイル](examples/voice-automation-example.ts)
- [AIコーディングルール](CLAUDE.md)

## 🎬 デモ動画

準備中...

## 📞 お問い合わせ

質問や提案がある場合は、Issuesでお気軽にお声がけください！

---

⚾ **Let's make some baseball videos with なんJ spirit!** ⚾  
🎤 **Powered by VoiceVox Multi-Pattern Audio Automation** 🎤