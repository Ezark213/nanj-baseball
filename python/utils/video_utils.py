#!/usr/bin/env python3
"""
動画処理ユーティリティ関数
"""

import os
import json
import hashlib
import tempfile
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
import logging

try:
    from moviepy.editor import VideoFileClip, AudioFileClip
    import numpy as np
    from PIL import Image
except ImportError:
    pass

logger = logging.getLogger(__name__)

def get_media_info(file_path: str) -> Dict[str, Any]:
    """
    メディアファイルの情報を取得
    
    Args:
        file_path: ファイルパス
    
    Returns:
        Dict: メディア情報
    """
    if not os.path.exists(file_path):
        return {"error": "ファイルが存在しません"}
    
    try:
        file_extension = Path(file_path).suffix.lower()
        file_size = os.path.getsize(file_path)
        
        info = {
            "file_path": file_path,
            "file_size": file_size,
            "extension": file_extension
        }
        
        if file_extension in ['.mp4', '.avi', '.mov', '.mkv', '.webm']:
            # 動画ファイル
            with VideoFileClip(file_path) as video:
                info.update({
                    "type": "video",
                    "duration": video.duration,
                    "fps": video.fps,
                    "resolution": video.size,
                    "has_audio": video.audio is not None
                })
                
        elif file_extension in ['.wav', '.mp3', '.aac', '.m4a', '.ogg']:
            # 音声ファイル
            with AudioFileClip(file_path) as audio:
                info.update({
                    "type": "audio",
                    "duration": audio.duration,
                    "fps": audio.fps,
                    "channels": audio.nchannels if hasattr(audio, 'nchannels') else None
                })
                
        elif file_extension in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']:
            # 画像ファイル
            with Image.open(file_path) as img:
                info.update({
                    "type": "image",
                    "resolution": img.size,
                    "mode": img.mode,
                    "format": img.format
                })
        
        return info
        
    except Exception as e:
        return {"error": str(e)}

def validate_video_config(config: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    動画合成設定の検証
    
    Args:
        config: 動画合成設定
    
    Returns:
        Tuple[bool, List[str]]: (有効性, エラーメッセージリスト)
    """
    errors = []
    
    # 必須フィールドの確認
    required_fields = ["audio_file", "output_path"]
    for field in required_fields:
        if field not in config:
            errors.append(f"必須フィールドが不足: {field}")
    
    # ファイル存在確認
    if "audio_file" in config and not os.path.exists(config["audio_file"]):
        errors.append(f"音声ファイルが存在しません: {config['audio_file']}")
    
    if "subtitle_image" in config and config["subtitle_image"]:
        if not os.path.exists(config["subtitle_image"]):
            errors.append(f"字幕画像が存在しません: {config['subtitle_image']}")
    
    if "background_video" in config and config["background_video"]:
        if not os.path.exists(config["background_video"]):
            errors.append(f"背景動画が存在しません: {config['background_video']}")
    
    # 出力パスの確認
    if "output_path" in config:
        output_dir = os.path.dirname(config["output_path"])
        if output_dir and not os.path.exists(output_dir):
            try:
                os.makedirs(output_dir, exist_ok=True)
            except Exception as e:
                errors.append(f"出力ディレクトリ作成失敗: {str(e)}")
    
    return len(errors) == 0, errors

def generate_video_filename(text: str, pattern: str = "video", timestamp: bool = True) -> str:
    """
    動画ファイル名を生成
    
    Args:
        text: 元テキスト
        pattern: パターン名
        timestamp: タイムスタンプを含むか
    
    Returns:
        str: ファイル名
    """
    # テキストのハッシュ値生成
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    
    # タイムスタンプ
    timestamp_str = ""
    if timestamp:
        from datetime import datetime
        timestamp_str = f"_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    return f"nanj_{pattern}_{text_hash}{timestamp_str}.mp4"

def calculate_optimal_resolution(
    background_resolution: Optional[Tuple[int, int]] = None,
    target_quality: str = "high"
) -> Tuple[int, int]:
    """
    最適な解像度を計算
    
    Args:
        background_resolution: 背景動画の解像度
        target_quality: 品質レベル ('low', 'medium', 'high', '4k')
    
    Returns:
        Tuple[int, int]: 最適解像度 (width, height)
    """
    quality_presets = {
        'low': (1280, 720),      # 720p
        'medium': (1920, 1080),  # 1080p
        'high': (1920, 1080),    # 1080p
        '4k': (3840, 2160)       # 4K
    }
    
    target_resolution = quality_presets.get(target_quality, (1920, 1080))
    
    if background_resolution:
        # 背景動画の解像度を考慮
        bg_width, bg_height = background_resolution
        target_width, target_height = target_resolution
        
        # アスペクト比を維持しながら調整
        bg_aspect = bg_width / bg_height
        target_aspect = target_width / target_height
        
        if abs(bg_aspect - target_aspect) > 0.1:
            # アスペクト比が大きく異なる場合は背景に合わせる
            if bg_width >= target_width and bg_height >= target_height:
                return (bg_width, bg_height)
    
    return target_resolution

def estimate_processing_time(config: Dict[str, Any]) -> float:
    """
    処理時間を推定
    
    Args:
        config: 動画合成設定
    
    Returns:
        float: 推定処理時間（秒）
    """
    base_time = 10  # 基本処理時間（秒）
    
    try:
        # 音声ファイルの長さに基づく
        if "audio_file" in config and os.path.exists(config["audio_file"]):
            audio_info = get_media_info(config["audio_file"])
            if "duration" in audio_info:
                duration = audio_info["duration"]
                base_time += duration * 2  # 動画長の2倍の処理時間
        
        # 背景動画の有無
        if "background_video" in config and config["background_video"]:
            base_time *= 1.5  # 1.5倍の処理時間
        
        # 解像度による調整
        settings = config.get("settings", {})
        video_settings = settings.get("video", {})
        resolution = video_settings.get("resolution", (1920, 1080))
        
        if resolution[0] >= 3840:  # 4K
            base_time *= 3
        elif resolution[0] >= 1920:  # 1080p
            base_time *= 1.5
        
        return base_time
        
    except Exception:
        return base_time

def create_test_media_files(output_dir: str) -> Dict[str, str]:
    """
    テスト用メディアファイルを作成
    
    Args:
        output_dir: 出力ディレクトリ
    
    Returns:
        Dict[str, str]: 作成されたファイルのパス
    """
    os.makedirs(output_dir, exist_ok=True)
    
    created_files = {}
    
    try:
        # テスト用背景動画（5秒間の緑色画面）
        from moviepy.editor import ColorClip
        
        bg_video_path = os.path.join(output_dir, "test_background.mp4")
        if not os.path.exists(bg_video_path):
            bg_clip = ColorClip(size=(1920, 1080), color=(34, 139, 34), duration=5)
            bg_clip.write_videofile(bg_video_path, fps=30, verbose=False, logger=None)
            bg_clip.close()
        created_files["background_video"] = bg_video_path
        
        # テスト用音声（無音3秒）
        from moviepy.editor import AudioClip
        
        audio_path = os.path.join(output_dir, "test_audio.wav")
        if not os.path.exists(audio_path):
            def make_silence(duration):
                return lambda t: 0
            
            audio_clip = AudioClip(make_silence(3), duration=3)
            audio_clip.write_audiofile(audio_path, verbose=False, logger=None)
            audio_clip.close()
        created_files["audio_file"] = audio_path
        
        # テスト用字幕画像
        subtitle_path = os.path.join(output_dir, "test_subtitle.png")
        if not os.path.exists(subtitle_path):
            img = Image.new('RGBA', (800, 100), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            
            # 簡単なテキストを描画
            try:
                # デフォルトフォントを使用
                draw.text((50, 30), "テスト字幕なのだ！", fill=(255, 255, 255, 255))
            except:
                # フォント読み込みに失敗した場合はスキップ
                pass
            
            img.save(subtitle_path, 'PNG')
        created_files["subtitle_image"] = subtitle_path
        
        logger.info(f"テスト用メディアファイル作成完了: {output_dir}")
        
    except Exception as e:
        logger.error(f"テスト用メディアファイル作成エラー: {str(e)}")
    
    return created_files

def cleanup_temp_files(file_paths: List[str]) -> None:
    """
    一時ファイルのクリーンアップ
    
    Args:
        file_paths: 削除するファイルパスのリスト
    """
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"一時ファイル削除: {file_path}")
        except Exception as e:
            logger.warning(f"一時ファイル削除失敗: {file_path} - {str(e)}")

def format_file_size(size_bytes: int) -> str:
    """
    ファイルサイズを読みやすい形式に変換
    
    Args:
        size_bytes: バイト数
    
    Returns:
        str: フォーマット済みサイズ
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} PB"

def validate_system_resources() -> Dict[str, Any]:
    """
    システムリソースを確認
    
    Returns:
        Dict[str, Any]: システム情報
    """
    import psutil
    import platform
    
    return {
        "platform": platform.system(),
        "python_version": platform.python_version(),
        "cpu_count": psutil.cpu_count(),
        "memory_gb": round(psutil.virtual_memory().total / (1024**3), 2),
        "disk_free_gb": round(psutil.disk_usage('/').free / (1024**3), 2) if platform.system() != 'Windows' else 
                       round(psutil.disk_usage('C:\\').free / (1024**3), 2),
        "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
    }