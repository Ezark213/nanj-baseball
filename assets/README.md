# Assets Directory

このディレクトリは、動画生成で使用する素材ファイルを格納します。

## ディレクトリ構成

```
assets/
├── backgrounds/        # 背景素材
│   ├── images/        # 背景画像 (JPG, PNG)
│   └── videos/        # 背景動画 (MP4, MOV)
├── gifs/              # GIFアニメーション素材
│   ├── reactions/     # リアクション系GIF
│   └── baseball/      # 野球関連GIF
├── music/             # 音楽・効果音素材
│   ├── bgm/          # 背景音楽 (MP3, WAV)
│   └── sfx/          # 効果音 (MP3, WAV)
├── fonts/             # フォントファイル
└── assets-config.json # 素材設定ファイル
```

## 使用方法

1. **素材ファイルを配置**
   - 各カテゴリのフォルダに素材ファイルを配置

2. **設定ファイル更新**
   - `assets-config.json`で素材のパスを設定

3. **自動選択**
   - システムが感情分析に基づいて適切な素材を自動選択

## 素材の種類

### 背景素材
- **野球場の画像**: フィールド、スタジアム、ナイトゲーム
- **動画背景**: 動くスタジアム映像、観客の様子

### GIFアニメーション
- **興奮系**: celebration.gif, excited.gif, home_run.gif
- **落ち込み系**: disappointed.gif, sad.gif
- **一般**: baseball.gif, reactions.gif

### 音楽素材
- **BGM**: 野球テーマ曲、スタジアム音楽
- **効果音**: 歓声、バット音、球場のざわめき

## 感情分析との連携

システムは生成されたなんJ語コメントの感情を分析し、適切な素材を自動選択：

- **興奮コメント** → celebration.gif + 盛り上がるBGM
- **落ち込みコメント** → disappointed.gif + 静かなBGM  
- **一般コメント** → baseball.gif + 標準BGM

## サンプル設定ファイル

`assets-config.json`の例：

```json
{
  "backgrounds": {
    "baseball_field": "backgrounds/images/baseball_field.jpg",
    "night_game": "backgrounds/images/night_game.jpg", 
    "stadium": "backgrounds/videos/stadium.mp4"
  },
  "gifs": {
    "home_run": "gifs/baseball/home_run.gif",
    "celebration": "gifs/reactions/celebration.gif",
    "disappointed": "gifs/reactions/disappointed.gif",
    "excited": "gifs/reactions/excited.gif"
  },
  "music": {
    "bgm_default": "music/bgm/baseball_theme.mp3",
    "sfx_cheer": "music/sfx/crowd_cheer.mp3",
    "sfx_hit": "music/sfx/bat_hit.mp3"
  },
  "fonts": {
    "main": "fonts/NotoSansJP-Bold.otf",
    "subtitle": "fonts/NotoSansJP-Regular.otf"
  }
}
```

## 注意事項

- 素材ファイルは著作権に注意して使用してください
- 大容量ファイルは処理時間に影響する可能性があります
- サポート形式: 
  - 画像: JPG, PNG
  - 動画: MP4, MOV, AVI
  - 音声: MP3, WAV
  - GIF: GIF
  - フォント: TTF, OTF