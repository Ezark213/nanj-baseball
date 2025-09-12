# タイトル音声システム - クイックリファレンス

## 🚀 基本コマンド

```bash
# 1. タイトル音声生成（3テーマ分）
node scripts/generate-all-theme-titles.mjs

# 2. 単一テーマ動画生成（テスト用）
python scripts/test-theme3.py

# 3. VoiceVox API接続テスト
node scripts/test-voicevox-api.mjs

# 4. VoiceVox動作確認
curl -s http://localhost:50021/version
```

## ⚠️ 必須確認事項

### VoiceVox設定
- [ ] VoiceVox v0.14.6が起動中
- [ ] エンドポイント: `http://localhost:50021`（`127.0.0.1`は NG）
- [ ] `audio_query`は必ずPOSTメソッド使用

### ファイル構造
```
audio/nanj-YYYY-MM-DD/
├── title_gekiteki.wav        # テーマ1: 劇的逆転勝利
├── title_shushin_fail.wav    # テーマ2: 守護神失敗  
├── title_shinjin_katsuyaku.wav # テーマ3: 新人活躍
├── theme1_comment1_*.wav     # コメント音声
├── theme1_comment2_*.wav
...
```

## 🔧 トラブル対応

### VoiceVox API エラー
```bash
# 405 Method Not Allowed
→ localhost使用 + POSTメソッド確認

# 422 Unprocessable Entity  
→ リクエスト形式確認

# Connection refused
→ VoiceVox起動確認
```

### 音声ファイル問題
```bash
# タイトル音声が見つからない
→ ファイル存在確認: ls audio/nanj-*/title_*.wav

# 同じ音声が使用されている
→ ファイルサイズ確認: ls -la audio/nanj-*/title_*.wav
```

## 📝 設定変更箇所

### 新しい日付で生成
```javascript
// scripts/generate-all-theme-titles.mjs
const OUTPUT_DIR = './audio/nanj-2025-09-XX';  // 日付変更
```

### テーマ追加
```javascript
// scripts/generate-all-theme-titles.mjs
const themeData = [
    // ... 既存テーマ
    {
        num: 4,
        title: "【新テーマ】新しいタイトルキターーー！！",
        filename: "title_new_theme.wav"
    }
];
```

```python
# python/video_composer.py
theme_title_files = {
    1: 'title_gekiteki.wav',
    2: 'title_shushin_fail.wav', 
    3: 'title_shinjin_katsuyaku.wav',
    4: 'title_new_theme.wav'  # 新追加
}
```

## 📊 正常動作チェックリスト

### 音声生成確認
- [ ] 3つのタイトル音声ファイルが異なるサイズで生成
- [ ] テーマ1: ~113KB, テーマ2: ~337KB, テーマ3: ~245KB
- [ ] エラーログなし

### 動画生成確認  
```bash
# ログで確認すべき項目
2025-XX-XX XX:XX:XX,XXX - INFO - タイトル音声配置: title_gekiteki.wav (0.0s-4.76s)     # テーマ1
2025-XX-XX XX:XX:XX,XXX - INFO - タイトル音声配置: title_shushin_fail.wav (0.0s-4.76s)  # テーマ2  
2025-XX-XX XX:XX:XX,XXX - INFO - タイトル音声配置: title_shinjin_katsuyaku.wav (0.0s-4.76s) # テーマ3
```

- [ ] 各テーマで異なるタイトル音声ファイルが使用されている
- [ ] 音声配置: 0.0s-4.76s（タイトル）→ 4.76s-100.00s（コメント20個）
- [ ] 動画時間: 100.00秒 (1:40)

## 🔄 月次メンテナンス

### ファイル整理
```bash
# 古い音声ファイル削除（2週間以上前）
find audio/ -name "nanj-*" -mtime +14 -exec rm -rf {} \;

# ログファイル整理
find . -name "*.log" -mtime +30 -delete
```

### 設定確認
- [ ] VoiceVoxバージョン確認
- [ ] nanJ語パターンの更新検討
- [ ] 新テーマ追加の検討

## 💡 パフォーマンス最適化

### API呼び出し制限
```javascript
// 500ms間隔で制限
await new Promise(resolve => setTimeout(resolve, 500));
```

### ファイル重複チェック
```javascript
// 既存ファイルスキップで高速化
if (fs.existsSync(outputPath)) {
    continue;
}
```

### メモリ使用量
```python  
# 音声クリップの適切な解放
# original_audio.close()  # 必要に応じて
```

---
**最終更新**: 2025-09-13  
**対象バージョン**: VoiceVox v0.14.6, Python MoviePy 1.0.3