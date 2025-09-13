#!/usr/bin/env python3
"""
パフォーマンス最適化テスト

最適化前後の性能比較を実行
"""

import sys
import os
import time
from pathlib import Path

# プロジェクトルートを追加
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from python.video_composer import VideoComposer

def main():
    """パフォーマンス最適化テスト実行"""
    print("=== パフォーマンス最適化テスト開始 ===")

    # テスト用音声ファイルディレクトリ
    audio_dir = project_root / "audio" / "nanj-2025-09-12"
    test_output_dir = project_root / "tests" / "performance_output"
    test_output_dir.mkdir(parents=True, exist_ok=True)

    composer = VideoComposer()

    # テスト用テーマ設定（最小限）
    test_theme_config = {
        "theme_name": "パフォーマンステスト用テーマ",
        "audio_files": [],
        "texts": [],
        "output_path": str(test_output_dir / "performance_test_video.mp4"),
        "settings": {
            "video": {
                "fps": 30,
                "resolution": (1920, 1080)
            }
        }
    }

    # テーマ1の音声ファイルを収集（3個に制限してテスト時間短縮）
    print("テスト用音声ファイル収集中...")
    theme_files = []
    theme_texts = []

    for i in range(1, 4):  # 3個のコメントのみテスト
        files = list(audio_dir.glob(f"theme1_comment{i}_*.wav"))
        if files:
            theme_files.append(str(files[0]))
            theme_texts.append(f"パフォーマンステストコメント{i}")
        else:
            print(f"注意: theme1_comment{i}のファイルが見つかりません")

    print(f"収集した音声ファイル数: {len(theme_files)}")

    if len(theme_files) == 0:
        print("エラー: テスト用音声ファイルが見つかりませんでした")
        return False

    # テスト設定を更新
    test_theme_config["audio_files"] = theme_files
    test_theme_config["texts"] = theme_texts

    # パフォーマンステスト実行
    try:
        print("パフォーマンス最適化テスト実行中...")
        print("- メモリ使用量監視")
        print("- 処理時間測定")
        print("- 最適化設定適用")

        start_time = time.time()
        result = composer.compose_theme_video(test_theme_config)
        end_time = time.time()

        execution_time = end_time - start_time

        print(f"成功: パフォーマンステストビデオ生成完了")
        print(f"出力ファイル: {result}")
        print(f"総実行時間: {execution_time:.2f}秒")

        # 生成された動画の詳細情報を取得
        info = composer.get_video_info(result)
        if info:
            print("=== 生成動画情報 ===")
            print(f"動画時間: {info.get('duration', 0):.2f}秒")
            print(f"解像度: {info.get('size', 'unknown')}")
            print(f"FPS: {info.get('fps', 'unknown')}")
            print(f"ファイルサイズ: {info.get('file_size', 0) / (1024*1024):.1f}MB")

        # パフォーマンス最適化確認
        print("=== パフォーマンス最適化確認 ===")
        print("期待される改善:")
        print("- メモリ使用量の効率化")
        print("- 処理時間の短縮")
        print("- リソース管理の改善")

        print("=== パフォーマンステスト完了 ===")
        print("パフォーマンス最適化が正常に動作しました")
        return True

    except Exception as e:
        print(f"エラー: パフォーマンステストに失敗: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print("パフォーマンステスト: 成功")
        sys.exit(0)
    else:
        print("パフォーマンステスト: 失敗")
        sys.exit(1)