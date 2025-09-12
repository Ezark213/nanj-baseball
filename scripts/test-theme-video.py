#!/usr/bin/env python3
"""
テーマ動画生成テストスクリプト

2025-09-12のテーマ1（20個の音声）を使用して新しい動画生成をテスト
"""

import sys
import os
import json
from pathlib import Path

# プロジェクトルートを追加
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from python.video_composer import VideoComposer

def main():
    """テーマ動画生成のテスト"""
    print("テーマ動画生成テスト開始")
    
    # 音声ファイルディレクトリ
    audio_dir = project_root / "audio" / "nanj-2025-09-12"
    output_dir = project_root / "videos" / "theme-test"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # テーマ1の音声ファイルを収集
    theme1_files = []
    theme1_texts = []
    
    # サイトから生成されたタイトルを使用
    theme_title = "【衝撃】9回2死からの劇的逆転勝利ファッ！？"
    
    for i in range(1, 21):  # theme1_comment1 から theme1_comment20 まで
        # パターンマッチでファイルを検索
        files = list(audio_dir.glob(f"theme1_comment{i}_*.wav"))
        if files:
            theme1_files.append(str(files[0]))
            theme1_texts.append(f"劇的な逆転勝利のコメント{i}")
        else:
            print(f"警告: theme1_comment{i}のファイルが見つかりません")
    
    print(f"収集した音声ファイル数: {len(theme1_files)}")
    
    if len(theme1_files) == 0:
        print("エラー: 音声ファイルが見つかりませんでした")
        return
    
    # テーマ動画設定
    theme_config = {
        "theme_name": theme_title,  # サイトから生成されたタイトルを使用
        "audio_files": theme1_files,
        "texts": theme1_texts,  # テキスト字幕を有効化
        "output_path": str(output_dir / "theme1_combined_video.mp4"),
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
        print("テーマ動画合成中...")
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