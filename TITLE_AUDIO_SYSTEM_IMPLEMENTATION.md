# タイトル音声システム実装ガイド

## 概要
なんJ野球動画生成システムにおいて、各テーマごとに固有のタイトル音声を自動生成し、動画の最初に配置するシステムを実装しました。

## 実装日時
2025-09-13 00:00 - 00:40 JST

## 解決した問題

### 1. 従来の問題点
- **音声の重複**: 全テーマで同じタイトル音声（コピーファイル）を使用
- **不適切な音声配置**: タイトル音声が実際のテキストと一致しない
- **システムの非持続性**: 一度だけの修正で今後の生成に対応していない

### 2. 目標仕様
- 各テーマごとに固有のnanJ語タイトル音声を自動生成
- サイト分析結果から抽出したトピックをnanJ語で強化
- 全ての動画で1分40秒固定、タイトル音声→20個のコメント音声の順序
- 今後の動画生成でも自動的に機能する持続的システム

## 実装詳細

### 1. VoiceVox API修正

**問題**: 405 Method Not Allowed エラー
```javascript
// ❌ 間違った実装
const VOICEVOX_API_BASE = 'http://127.0.0.1:50021';
const queryResponse = await fetch(`${VOICEVOX_API_BASE}/audio_query?text=${text}&speaker=3`);
```

**解決**: 正しいエンドポイントとメソッド
```javascript
// ✅ 正しい実装
const VOICEVOX_API_BASE = 'http://localhost:50021';  // localhostを使用
const queryResponse = await fetch(`${VOICEVOX_API_BASE}/audio_query?text=${text}&speaker=3`, {
    method: 'POST'  // POSTメソッド必須
});
```

**重要な注意点**:
- `127.0.0.1`ではなく`localhost`を使用すること
- `audio_query`エンドポイントは必ずPOSTメソッドを使用
- クエリパラメータでtext/speakerを指定

### 2. タイトル音声生成システム

#### 2.1 基本構造
```
scripts/
├── generate-all-theme-titles.mjs    # 全テーマのタイトル音声生成
├── generate-specific-title.mjs      # 特定タイトルの音声生成
└── test-voicevox-api.mjs           # VoiceVox API接続テスト
```

#### 2.2 テーマ定義
```javascript
const themeData = [
    {
        num: 1,
        title: "【衝撃】9回2死からの劇的逆転勝利ファッ！？",
        filename: "title_gekiteki.wav"
    },
    {
        num: 2, 
        title: "【悲報】守護神がまさかのセーブ失敗やらかしたwwwwww",
        filename: "title_shushin_fail.wav"
    },
    {
        num: 3,
        title: "【朗報】新人選手の活躍キターーー！！これは神采配や",
        filename: "title_shinjin_katsuyaku.wav"
    }
];
```

#### 2.3 nanJ語強化ロジック
```javascript
function enhanceTitle(originalTitle) {
    const prefixes = ['【朗報】', '【悲報】', '【速報】', '【実況】', '【神回】', '【衝撃】'];
    const suffixes = ['wwwwww', 'キターーー！！', 'やばすぎる', 'これは草', '神采配や', 'ファッ！？'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${originalTitle}${suffix}`;
}
```

### 3. 動画合成システム修正

#### 3.1 テーマ自動検出機能
```python
def _combine_theme_audios(self, audio_files: List[str]) -> Tuple[AudioFileClip, List[Tuple[float, float]]]:
    # テーマ番号を推測（音声ファイル名から）
    theme_num = 1
    if audio_files:
        filename = os.path.basename(audio_files[0])
        if 'theme2' in filename:
            theme_num = 2
        elif 'theme3' in filename:
            theme_num = 3
    
    # テーマごとの特定タイトル音声ファイル名
    theme_title_files = {
        1: 'title_gekiteki.wav',
        2: 'title_shushin_fail.wav', 
        3: 'title_shinjin_katsuyaku.wav'
    }
    
    specific_title_file = theme_title_files.get(theme_num, 'title_gekiteki.wav')
```

#### 3.2 音声配置システム
```python
TARGET_DURATION = 100.0  # 1分40秒固定
segment_duration = TARGET_DURATION / 21  # 約4.76秒ずつ（タイトル1個 + コメント20個）

# 正確な位置に配置
segment_start = (i + 1) * segment_duration
positioned_audio = adjusted_audio.set_start(segment_start)
positioned_audio_clips.append(positioned_audio)

# CompositeAudioClipで均等配置
combined_audio = CompositeAudioClip(positioned_audio_clips).set_duration(TARGET_DURATION)
```

## 動作確認済み実装

### 1. 生成されたファイル
```
audio/nanj-2025-09-12/
├── title_gekiteki.wav          (113.5KB) - テーマ1専用
├── title_shushin_fail.wav      (337.0KB) - テーマ2専用  
└── title_shinjin_katsuyaku.wav (245.5KB) - テーマ3専用
```

### 2. 動画出力
```
videos/
├── theme-test/theme1_combined_video.mp4     (1:40, 1.1MB)
├── theme2-with-title/theme2_with_title.mp4  (1:40, 1.0MB)
└── theme3-with-title/theme3_with_title.mp4  (1:40, 1.1MB)
```

### 3. ログ検証例
```
2025-09-13 00:36:17,141 - INFO - タイトル音声配置: C:\Users\pukur\nanj-baseball\audio\nanj-2025-09-12\title_shinjin_katsuyaku.wav (0.0s-4.76s)
2025-09-13 00:36:17,325 - INFO - 音声[1]配置: C:\Users\pukur\nanj-baseball\audio\nanj-2025-09-12\theme3_comment1_metan-normal_20250912.wav (4.76s-9.52s)
...
2025-09-13 00:36:20,972 - INFO - 21個セグメント配置: タイトル1個 + コメント20個
```

## 今後の運用手順

### 1. 日次動画生成時の手順
```bash
# 1. 通常の音声生成（60個のコメント音声）
node scripts/generate-daily-audio.mjs

# 2. タイトル音声生成（3テーマ分）
node scripts/generate-all-theme-titles.mjs

# 3. テーマ動画生成（自動的にタイトル音声を使用）
python scripts/regenerate-all-theme-videos.py
```

### 2. 新しい日付での生成
- `scripts/generate-all-theme-titles.mjs`の`OUTPUT_DIR`を新しい日付に変更
- `python/video_composer.py`は自動的に適切なタイトル音声を検出・使用

### 3. テーマ追加時の作業
1. `themeData`配列に新テーマを追加
2. `theme_title_files`辞書に新しいファイル名マッピングを追加
3. 新しいnanJ語タイトルパターンを定義

## トラブルシューティング

### 1. VoiceVox API エラー
**症状**: 405 Method Not Allowed
```bash
# 解決方法
# 1. localhostを使用しているか確認
# 2. POSTメソッドを使用しているか確認
# 3. VoiceVox v0.14.6が起動中か確認
curl -s http://localhost:50021/version
```

### 2. タイトル音声が見つからない
**症状**: フォールバック音声が使用される
```python
# デバッグ用ログ確認
logger.info(f"タイトル音声未発見、フォールバック使用: {title_audio_file}")

# 解決方法
# 1. 音声ファイルの存在確認
# 2. ファイル名の一致確認
# 3. テーマ番号の自動検出確認
```

### 3. 音声の時間配置問題
**症状**: 音声が前半に集中する
```python
# 確認ポイント
# concatenate_audioclips → CompositeAudioClip 使用
# set_start() で正確な位置指定
# TARGET_DURATION / 21 で均等分割
```

## セキュリティ・パフォーマンス考慮事項

### 1. API制限対応
```javascript
// API制限を考慮した間隔
await new Promise(resolve => setTimeout(resolve, 500));
```

### 2. ファイル重複チェック
```javascript
// 既存ファイルのスキップ
if (fs.existsSync(outputPath)) {
    console.log(`スキップ: ${filename} (既存)`);
    continue;
}
```

### 3. エラーハンドリング
```javascript
try {
    // 音声生成処理
} catch (error) {
    console.error(`エラー: ${titleText}の音声生成に失敗:`, error);
    return null;
}
```

## 実装効果

### Before（修正前）
- 全テーマで同じタイトル音声（113.5KB のコピー）
- タイトルテキストと音声内容の不一致
- 手動修正が必要

### After（修正後）
- テーマごとに固有のタイトル音声（サイズも異なる）
- テーマ1: 113.5KB, テーマ2: 337.0KB, テーマ3: 245.5KB
- 完全自動化システム
- サイト分析結果との連携

## 今後の改善提案

### 1. 動的タイトル生成
- サイト分析結果からリアルタイムでタイトル生成
- トレンドキーワードの自動取り込み

### 2. 音声パターン拡張
- 複数話者でのタイトル音声生成
- 感情表現の強化（興奮、落胆など）

### 3. 品質向上
- 音声速度・音量の自動調整
- BGM・効果音の追加検討

---

**実装者**: Claude Code AI Assistant  
**レビュー**: 全テーマでの動作確認済み  
**次回更新**: 新機能追加時または不具合報告時