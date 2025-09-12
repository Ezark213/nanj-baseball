#!/usr/bin/env python3
"""
ランダム背景動画機能のテストスクリプト
"""

import sys
import os
from pathlib import Path

# プロジェクトルートを追加
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from python.video_composer import VideoComposer

def main():
    print("ランダム背景動画機能テスト開始")
    
    # 音声ファイルディレクトリ
    audio_dir = project_root / "audio" / "nanj-2025-09-12"
    output_dir = project_root / "videos" / "random-background-test"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # テーマ1の音声ファイルを収集（3個だけテスト用）
    theme_files = []
    theme_texts = []
    
    for i in range(1, 4):  # 3個のコメントだけでテスト
        files = list(audio_dir.glob(f"theme1_comment{i}_*.wav"))
        if files:
            theme_files.append(str(files[0]))
            theme_texts.append(f"ランダム背景テスト用コメント{i}")
    
    print(f"テスト用音声ファイル数: {len(theme_files)}")
    
    if len(theme_files) == 0:
        print("エラー: テスト用音声ファイルが見つかりませんでした")
        return
    
    composer = VideoComposer()
    
    # 5回テストして異なる背景動画が選ばれるか確認
    for test_num in range(1, 6):
        print(f"\n=== テスト {test_num}/5 ===")
        
        # テーマ動画設定（background_videoを指定しない = ランダム選択）
        theme_config = {
            "theme_name": f"ランダム背景テスト{test_num}",
            "audio_files": theme_files,
            "texts": theme_texts,
            "output_path": str(output_dir / f"random_bg_test_{test_num}.mp4"),
            # background_videoを指定しない = ランダム選択される
            "settings": {
                "video": {
                    "fps": 30,
                    "resolution": (1920, 1080)
                }
            }
        }
        
        try:
            print("動画生成中...")
            result = composer.compose_theme_video(theme_config)
            print(f"✅ 成功: {os.path.basename(result)}")
            
            # 動画情報を表示
            info = composer.get_video_info(result)
            if info:
                print(f"   時間: {info.get('duration', 0):.1f}秒")
                print(f"   サイズ: {info.get('file_size', 0) / (1024*1024):.1f}MB")
            
        except Exception as e:
            print(f"❌ エラー: {str(e)}")
            continue
    
    print(f"\n✅ ランダム背景動画テスト完了")
    print(f"出力先: {output_dir}")
    print("生成された動画を確認して、異なる背景動画が使用されていることを確認してください。")

if __name__ == "__main__":
    main()