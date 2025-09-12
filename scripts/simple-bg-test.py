#!/usr/bin/env python3
"""簡単な背景動画ランダム選択テスト"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'python'))

from video_composer import VideoComposer
import glob

def test_random_selection():
    # VideoComposerインスタンス作成
    composer = VideoComposer()
    
    # 5回ランダム選択をテスト
    selected_videos = []
    for i in range(5):
        selected = composer._select_random_background_video()
        if selected:
            filename = os.path.basename(selected)
            selected_videos.append(filename)
            print(f"Test {i+1}: {filename}")
        else:
            print(f"Test {i+1}: No video selected")
    
    # 結果分析
    unique_videos = set(selected_videos)
    print(f"\n選択された動画の種類数: {len(unique_videos)}")
    print(f"選択されたファイル: {list(unique_videos)}")
    
    # 両方の背景動画が利用可能かチェック
    video_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "backgrounds", "videos")
    available_videos = glob.glob(os.path.join(video_dir, "*.mp4"))
    print(f"\n利用可能な背景動画: {[os.path.basename(v) for v in available_videos]}")

if __name__ == "__main__":
    test_random_selection()