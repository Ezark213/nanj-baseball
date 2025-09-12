#!/usr/bin/env python3
"""
単一テーマ動画生成テスト（タイトル音声対応）
"""

import sys
import os
from pathlib import Path

# プロジェクトルートを追加
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from python.video_composer import VideoComposer

def main():
    print("テーマ2動画生成テスト（タイトル音声対応）")
    
    # 音声ファイルディレクトリ
    audio_dir = project_root / "audio" / "nanj-2025-09-12"
    output_dir = project_root / "videos" / "theme2-with-title"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # テーマ2の音声ファイルを収集
    theme_files = []
    theme_texts = []
    theme_title = "【悲報】守護神がまさかのセーブ失敗やらかしたwwwwww"
    
    for i in range(1, 21):  # theme2_comment1 から theme2_comment20 まで
        files = list(audio_dir.glob(f"theme2_comment{i}_*.wav"))
        if files:
            theme_files.append(str(files[0]))
            theme_texts.append(f"守護神失敗のコメント{i}")
        else:
            print(f"警告: theme2_comment{i}のファイルが見つかりません")
    
    print(f"収集した音声ファイル数: {len(theme_files)}")
    
    if len(theme_files) == 0:
        print("エラー: 音声ファイルが見つかりませんでした")
        return
    
    # テーマ動画設定
    theme_config = {
        "theme_name": theme_title,
        "audio_files": theme_files,
        "texts": theme_texts,
        "output_path": str(output_dir / "theme2_with_title.mp4"),
        "settings": {
            "video": {
                "fps": 30,
                "resolution": (1920, 1080)
            }
        }
    }
    
    # 動画生成実行
    try:
        composer = VideoComposer()
        print("テーマ2動画合成中...")
        result = composer.compose_theme_video(theme_config)
        print(f"成功: {result}")
        
        # 動画情報を表示
        info = composer.get_video_info(result)
        if info:
            print(f"動画情報:")
            print(f"   時間: {info.get('duration', 0):.2f}秒")
            print(f"   解像度: {info.get('size', 'unknown')}")
            print(f"   FPS: {info.get('fps', 'unknown')}")
            print(f"   ファイルサイズ: {info.get('file_size', 0) / (1024*1024):.1f}MB")
        
    except Exception as e:
        print(f"エラー: {str(e)}")
        return

if __name__ == "__main__":
    main()