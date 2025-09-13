#!/usr/bin/env python3
"""
動画生成パフォーマンス最適化クラス

メモリ効率化、処理速度向上、リソース管理の最適化
"""

import gc
import os
import logging
import time
from typing import Dict, Any, Optional
from pathlib import Path
import psutil
from moviepy.editor import VideoFileClip, AudioFileClip

logger = logging.getLogger(__name__)

class PerformanceOptimizer:
    """動画生成パフォーマンス最適化クラス"""

    def __init__(self):
        self.memory_threshold = 0.8  # メモリ使用率80%で警告
        self.temp_files = []  # 一時ファイル管理
        self.performance_stats = {}

    def monitor_memory_usage(self) -> Dict[str, float]:
        """メモリ使用量監視"""
        memory = psutil.virtual_memory()
        return {
            "percent": memory.percent,
            "available_gb": memory.available / (1024**3),
            "used_gb": memory.used / (1024**3),
            "total_gb": memory.total / (1024**3)
        }

    def check_memory_pressure(self) -> bool:
        """メモリ圧迫状況をチェック"""
        memory_info = self.monitor_memory_usage()
        if memory_info["percent"] > self.memory_threshold * 100:
            logger.warning(f"メモリ使用率が高い: {memory_info['percent']:.1f}%")
            return True
        return False

    def force_garbage_collection(self):
        """強制ガベージコレクション実行"""
        if self.check_memory_pressure():
            logger.info("メモリ圧迫検知 - ガベージコレクション実行")
            gc.collect()

    def get_optimal_video_settings(self, input_duration: float) -> Dict[str, Any]:
        """動画長に基づく最適設定を取得"""
        # 短い動画（30秒未満）: 高品質
        if input_duration < 30:
            return {
                "codec": "libx264",
                "preset": "medium",
                "crf": 18,
                "audio_bitrate": "320k"
            }
        # 中程度の動画（30秒-2分）: バランス
        elif input_duration < 120:
            return {
                "codec": "libx264",
                "preset": "fast",
                "crf": 23,
                "audio_bitrate": "192k"
            }
        # 長い動画（2分以上）: 速度重視
        else:
            return {
                "codec": "libx264",
                "preset": "faster",
                "crf": 28,
                "audio_bitrate": "128k"
            }

    def optimize_moviepy_settings(self) -> Dict[str, Any]:
        """MoviePy最適化設定"""
        return {
            "verbose": False,  # ログ出力を削減
            "threads": min(os.cpu_count(), 4),  # CPUコア数に基づくスレッド数
            "temp_audiofile": "temp-audio.m4a",  # 音声一時ファイル
            "remove_temp": True,  # 一時ファイル自動削除
            "audio_fps": 22050,  # 音声サンプリングレート最適化
        }

    def cleanup_temp_files(self):
        """一時ファイルクリーンアップ"""
        for temp_file in self.temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    logger.debug(f"一時ファイル削除: {temp_file}")
            except Exception as e:
                logger.warning(f"一時ファイル削除失敗: {temp_file} - {e}")
        self.temp_files.clear()

    def close_clips_safely(self, *clips):
        """MoviePyクリップの安全なクローズ"""
        for clip in clips:
            if clip is not None:
                try:
                    clip.close()
                except Exception as e:
                    logger.warning(f"クリップクローズ失敗: {e}")

    def measure_performance(self, operation_name: str):
        """パフォーマンス測定デコレータ"""
        def decorator(func):
            def wrapper(*args, **kwargs):
                start_time = time.time()
                start_memory = self.monitor_memory_usage()

                try:
                    result = func(*args, **kwargs)

                    end_time = time.time()
                    end_memory = self.monitor_memory_usage()

                    execution_time = end_time - start_time
                    memory_delta = end_memory["used_gb"] - start_memory["used_gb"]

                    self.performance_stats[operation_name] = {
                        "execution_time": execution_time,
                        "memory_delta_gb": memory_delta,
                        "timestamp": time.time()
                    }

                    logger.info(f"{operation_name} 完了: {execution_time:.2f}秒, メモリ変化: {memory_delta:.2f}GB")
                    return result

                except Exception as e:
                    logger.error(f"{operation_name} 失敗: {e}")
                    raise

            return wrapper
        return decorator

    def get_performance_report(self) -> Dict[str, Any]:
        """パフォーマンスレポート生成"""
        total_time = sum(stats["execution_time"] for stats in self.performance_stats.values())
        total_memory = sum(stats["memory_delta_gb"] for stats in self.performance_stats.values())

        return {
            "total_execution_time": total_time,
            "total_memory_usage_gb": total_memory,
            "operation_count": len(self.performance_stats),
            "operations": self.performance_stats,
            "current_memory": self.monitor_memory_usage()
        }

    def optimize_audio_processing(self, audio_files: list) -> Dict[str, Any]:
        """音声処理最適化設定"""
        total_files = len(audio_files)

        # ファイル数に基づく最適化
        if total_files <= 5:
            # 少数ファイル: 品質重視
            return {
                "audio_fps": 44100,
                "nbytes": 4,
                "buffersize": 2000
            }
        elif total_files <= 20:
            # 中程度: バランス
            return {
                "audio_fps": 22050,
                "nbytes": 2,
                "buffersize": 1000
            }
        else:
            # 大量ファイル: 速度重視
            return {
                "audio_fps": 22050,
                "nbytes": 2,
                "buffersize": 500
            }

    def pre_process_validation(self, video_config: Dict[str, Any]) -> bool:
        """処理前のバリデーション"""
        # メモリチェック
        memory_info = self.monitor_memory_usage()
        if memory_info["available_gb"] < 1.0:
            logger.error(f"利用可能メモリ不足: {memory_info['available_gb']:.2f}GB")
            return False

        # 音声ファイル存在チェック
        audio_files = video_config.get("audio_files", [])
        missing_files = [f for f in audio_files if not os.path.exists(f)]
        if missing_files:
            logger.error(f"音声ファイルが見つかりません: {missing_files}")
            return False

        logger.info("処理前バリデーション完了")
        return True

    def __enter__(self):
        """コンテキストマネージャー開始"""
        self.performance_stats.clear()
        logger.info("パフォーマンス最適化開始")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """コンテキストマネージャー終了"""
        self.cleanup_temp_files()
        self.force_garbage_collection()

        if self.performance_stats:
            report = self.get_performance_report()
            logger.info(f"パフォーマンス最適化完了 - 総実行時間: {report['total_execution_time']:.2f}秒")