#!/usr/bin/env python3
"""
全テーマ動画の再生成スクリプト（タイトル音声対応）

2025-09-12の3テーマすべてをタイトル音声付きで再生成する
"""

import sys
import os
import json
from pathlib import Path

# プロジェクトルートを追加
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from python.video_composer import VideoComposer

def get_theme_title(theme_num):
    """テーマごとのタイトルを取得"""
    titles = {
        1: "【衝撃】9回2死からの劇的逆転勝利ファッ！？",
        2: "【悲報】守護神がまさかのセーブ失敗やらかしたwwwwww", 
        3: "【朗報】新人選手の活躍キターーー！！これは神采配や"
    }
    return titles.get(theme_num, f"テーマ{theme_num}")

def main():
    """全テーマ動画の再生成"""
    print("全テーマ動画再生成開始（タイトル音声対応）")
    
    # 音声ファイルディレクトリ
    audio_dir = project_root / "audio" / "nanj-2025-09-12"
    output_dir = project_root / "videos" / "nanj-2025-09-12-with-title"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    composer = VideoComposer()
    
    # 3つのテーマをすべて処理
    for theme_num in [1, 2, 3]:
        print(f"\n=== テーマ{theme_num}の動画生成 ===")
        
        # テーマの音声ファイルを収集
        theme_files = []
        theme_texts = []
        theme_title = get_theme_title(theme_num)
        
        for i in range(1, 21):  # theme{X}_comment1 から theme{X}_comment20 まで
            files = list(audio_dir.glob(f"theme{theme_num}_comment{i}_*.wav"))
            if files:
                theme_files.append(str(files[0]))
                theme_texts.append(f"{theme_title}のコメント{i}")
            else:
                print(f"警告: theme{theme_num}_comment{i}のファイルが見つかりません")
        
        print(f"収集した音声ファイル数: {len(theme_files)}")
        
        if len(theme_files) == 0:
            print(f"エラー: テーマ{theme_num}の音声ファイルが見つかりませんでした")
            continue
        
        # テーマ動画設定
        theme_config = {
            "theme_name": theme_title,
            "audio_files": theme_files,
            "texts": theme_texts,
            "output_path": str(output_dir / f"theme{theme_num}_with_title.mp4"),
            "settings": {
                "video": {
                    "fps": 30,
                    "resolution": (1920, 1080)
                }
            }
        }
        
        # 動画生成実行
        try:
            print(f"テーマ{theme_num}動画合成中...")
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
            print(f"エラー: テーマ{theme_num}の生成に失敗: {str(e)}")
            continue
    
    print("\n=== 全テーマ動画生成完了 ===")

if __name__ == "__main__":
    main()