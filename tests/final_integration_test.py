#!/usr/bin/env python3
"""
最終統合テスト - 全機能・エッジケース・異常ケース検証

Phase 6: Fin 最終品質検証用
"""

import sys
import os
import time
import json
from pathlib import Path
import traceback

# プロジェクトルートを追加
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from python.video_composer import VideoComposer

class FinalIntegrationTest:
    """最終統合テストクラス"""

    def __init__(self):
        self.test_results = {}
        self.passed_tests = 0
        self.failed_tests = 0
        self.output_dir = project_root / "tests" / "final_integration_output"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def log_test(self, test_name: str, result: bool, details: str = ""):
        """テスト結果をログ"""
        self.test_results[test_name] = {
            "passed": result,
            "details": details,
            "timestamp": time.time()
        }
        if result:
            self.passed_tests += 1
            print(f"[PASS] {test_name}: {details}")
        else:
            self.failed_tests += 1
            print(f"[FAIL] {test_name}: {details}")

    def test_title_audio_placement(self):
        """Test 1: タイトル音声配置精度検証"""
        try:
            composer = VideoComposer()
            audio_dir = project_root / "audio" / "nanj-2025-09-12"

            # テスト用設定
            test_config = {
                "theme_name": "タイトル音声配置テスト",
                "audio_files": [str(list(audio_dir.glob("theme1_comment1_*.wav"))[0])],
                "texts": ["テストコメント1"],
                "output_path": str(self.output_dir / "title_audio_test.mp4"),
                "settings": {"video": {"fps": 30, "resolution": (1920, 1080)}}
            }

            result = composer.compose_theme_video(test_config)

            # 生成確認
            if os.path.exists(result):
                info = composer.get_video_info(result)
                duration = info.get('duration', 0)

                # 期待値: 100秒 (21セグメント × 4.76秒)
                if 99 <= duration <= 101:
                    self.log_test("タイトル音声配置精度", True, f"動画時間: {duration:.2f}秒")
                else:
                    self.log_test("タイトル音声配置精度", False, f"動画時間異常: {duration:.2f}秒")
            else:
                self.log_test("タイトル音声配置精度", False, "動画生成失敗")

        except Exception as e:
            self.log_test("タイトル音声配置精度", False, f"例外発生: {str(e)}")

    def test_background_video_selection(self):
        """Test 2: 背景動画選択機能検証"""
        try:
            composer = VideoComposer()

            # 背景動画ディレクトリ確認
            bg_dir = project_root / "assets" / "backgrounds" / "videos"
            bg_videos = list(bg_dir.glob("*.mp4"))

            if len(bg_videos) >= 2:
                expected_videos = ["baseball_stadium.mp4", "pawapuro_baseball.mp4"]
                found_videos = [v.name for v in bg_videos]

                if all(v in found_videos for v in expected_videos):
                    self.log_test("背景動画選択機能", True, f"期待動画確認: {found_videos}")
                else:
                    self.log_test("背景動画選択機能", False, f"期待動画不足: {found_videos}")
            else:
                self.log_test("背景動画選択機能", False, f"背景動画数不足: {len(bg_videos)}")

        except Exception as e:
            self.log_test("背景動画選択機能", False, f"例外発生: {str(e)}")

    def test_performance_optimization(self):
        """Test 3: パフォーマンス最適化機能検証"""
        try:
            composer = VideoComposer()

            # パフォーマンス最適化機能確認
            if hasattr(composer, 'performance_optimizer'):
                optimizer = composer.performance_optimizer

                # メモリ監視機能確認
                memory_info = optimizer.monitor_memory_usage()
                if 'percent' in memory_info and 'available_gb' in memory_info:
                    self.log_test("パフォーマンス最適化", True,
                                f"メモリ監視動作: {memory_info['percent']:.1f}%使用")
                else:
                    self.log_test("パフォーマンス最適化", False, "メモリ監視機能異常")
            else:
                self.log_test("パフォーマンス最適化", False, "パフォーマンス最適化機能未実装")

        except Exception as e:
            self.log_test("パフォーマンス最適化", False, f"例外発生: {str(e)}")

    def test_edge_case_empty_audio_list(self):
        """Test 4: エッジケース - 空の音声リスト"""
        try:
            composer = VideoComposer()

            test_config = {
                "theme_name": "空音声リストテスト",
                "audio_files": [],  # 空リスト
                "texts": [],
                "output_path": str(self.output_dir / "empty_audio_test.mp4"),
                "settings": {"video": {"fps": 30, "resolution": (1920, 1080)}}
            }

            try:
                result = composer.compose_theme_video(test_config)
                self.log_test("エッジケース_空音声リスト", False, "例外が発生すべきところで成功")
            except Exception as expected_error:
                self.log_test("エッジケース_空音声リスト", True, f"期待通り例外発生: {type(expected_error).__name__}")

        except Exception as e:
            self.log_test("エッジケース_空音声リスト", False, f"予期しない例外: {str(e)}")

    def test_edge_case_missing_audio_file(self):
        """Test 5: エッジケース - 存在しない音声ファイル"""
        try:
            composer = VideoComposer()

            test_config = {
                "theme_name": "存在しないファイルテスト",
                "audio_files": ["nonexistent_file.wav"],  # 存在しないファイル
                "texts": ["テストコメント"],
                "output_path": str(self.output_dir / "missing_file_test.mp4"),
                "settings": {"video": {"fps": 30, "resolution": (1920, 1080)}}
            }

            try:
                result = composer.compose_theme_video(test_config)
                self.log_test("エッジケース_存在しないファイル", False, "例外が発生すべきところで成功")
            except Exception as expected_error:
                self.log_test("エッジケース_存在しないファイル", True, f"期待通り例外発生: {type(expected_error).__name__}")

        except Exception as e:
            self.log_test("エッジケース_存在しないファイル", False, f"予期しない例外: {str(e)}")

    def test_resource_cleanup(self):
        """Test 6: リソースクリーンアップ検証"""
        try:
            import psutil
            import gc

            # テスト前メモリ使用量
            memory_before = psutil.virtual_memory().used / (1024**3)

            composer = VideoComposer()

            # 小さなテスト実行
            audio_dir = project_root / "audio" / "nanj-2025-09-12"
            files = list(audio_dir.glob("theme1_comment1_*.wav"))

            if files:
                test_config = {
                    "theme_name": "リソースクリーンアップテスト",
                    "audio_files": [str(files[0])],
                    "texts": ["クリーンアップテスト"],
                    "output_path": str(self.output_dir / "cleanup_test.mp4"),
                    "settings": {"video": {"fps": 30, "resolution": (1920, 1080)}}
                }

                result = composer.compose_theme_video(test_config)

                # 強制ガベージコレクション
                gc.collect()

                # テスト後メモリ使用量
                memory_after = psutil.virtual_memory().used / (1024**3)
                memory_delta = memory_after - memory_before

                # メモリリークチェック (1GB以下の増加は正常とみなす)
                if memory_delta < 1.0:
                    self.log_test("リソースクリーンアップ", True, f"メモリ増加: {memory_delta:.2f}GB")
                else:
                    self.log_test("リソースクリーンアップ", False, f"メモリリーク疑い: {memory_delta:.2f}GB")
            else:
                self.log_test("リソースクリーンアップ", False, "テスト用音声ファイルなし")

        except Exception as e:
            self.log_test("リソースクリーンアップ", False, f"例外発生: {str(e)}")

    def run_all_tests(self):
        """全テスト実行"""
        print("最終統合テスト開始")
        print("=" * 60)

        # テスト実行
        self.test_title_audio_placement()
        self.test_background_video_selection()
        self.test_performance_optimization()
        self.test_edge_case_empty_audio_list()
        self.test_edge_case_missing_audio_file()
        self.test_resource_cleanup()

        print("=" * 60)
        print(f"最終統合テスト完了")
        print(f"成功: {self.passed_tests}")
        print(f"失敗: {self.failed_tests}")
        print(f"成功率: {(self.passed_tests / (self.passed_tests + self.failed_tests) * 100):.1f}%")

        return self.failed_tests == 0

def main():
    """メイン関数"""
    tester = FinalIntegrationTest()
    success = tester.run_all_tests()

    # 結果保存
    results_file = tester.output_dir / "final_test_results.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(tester.test_results, f, ensure_ascii=False, indent=2)

    print(f"\nテスト結果保存: {results_file}")

    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)