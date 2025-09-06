#!/usr/bin/env python3
"""
なんJ野球動画自動生成システム - 動画合成処理

VoiceVox音声 + 字幕 + 背景動画 → 完成動画
MoviePyを使用した高品質動画合成
"""

import json
import sys
import os
import tempfile
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import traceback

try:
    from moviepy.editor import (
        VideoFileClip, AudioFileClip, ImageClip, CompositeVideoClip,
        TextClip, ColorClip, concatenate_videoclips
    )
    from moviepy.video.fx import resize, fadeout, fadein
    from moviepy.audio.fx import audio_fadeout, audio_fadein
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:
    print(f"必須ライブラリが不足しています: {e}")
    print("pip install -r requirements.txt を実行してください")
    sys.exit(1)

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('video_composer.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class VideoComposer:
    """動画合成処理クラス"""
    
    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.default_settings = self._get_default_settings()
    
    def _get_default_settings(self) -> Dict[str, Any]:
        """デフォルト設定を取得"""
        return {
            "video": {
                "fps": 30,
                "resolution": (1920, 1080),
                "codec": "libx264",
                "bitrate": "5000k",
                "audio_codec": "aac"
            },
            "subtitle": {
                "position": "bottom",
                "margin": 50,
                "fade_duration": 0.3
            },
            "background": {
                "loop": True,
                "volume": 0.1  # 背景音量（10%）
            }
        }
    
    def compose_single_video(self, config: Dict[str, Any]) -> str:
        """
        単一動画を合成
        
        Args:
            config: 動画合成設定
                - text: 字幕テキスト
                - audio_file: 音声ファイルパス
                - subtitle_image: 字幕画像パス（オプション）
                - background_video: 背景動画パス（オプション）
                - output_path: 出力パス
                - settings: 追加設定
        
        Returns:
            str: 出力動画のパス
        """
        try:
            logger.info(f"動画合成開始: {config.get('output_path', '不明')}")
            
            # 設定の検証
            self._validate_config(config)
            
            # 音声クリップの読み込み
            audio_clip = self._load_audio(config["audio_file"])
            duration = audio_clip.duration
            
            # 背景動画の準備
            background_clip = self._prepare_background(
                config.get("background_video"), 
                duration,
                config.get("settings", {})
            )
            
            # 字幕クリップの準備
            subtitle_clip = self._prepare_subtitle(
                config.get("subtitle_image"),
                config.get("text", ""),
                duration,
                config.get("settings", {})
            )
            
            # 動画の合成
            final_video = self._compose_final_video(
                background_clip,
                subtitle_clip,
                audio_clip,
                config.get("settings", {})
            )
            
            # 出力
            output_path = self._export_video(final_video, config["output_path"], config.get("settings", {}))
            
            # クリーンアップ
            self._cleanup_clips([background_clip, subtitle_clip, audio_clip, final_video])
            
            logger.info(f"動画合成完了: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"動画合成エラー: {str(e)}")
            logger.error(traceback.format_exc())
            raise Exception(f"動画合成に失敗しました: {str(e)}")
    
    def compose_batch_videos(self, configs: List[Dict[str, Any]]) -> List[str]:
        """
        複数動画を一括合成
        
        Args:
            configs: 動画合成設定のリスト
        
        Returns:
            List[str]: 出力動画パスのリスト
        """
        results = []
        
        for i, config in enumerate(configs):
            try:
                logger.info(f"バッチ処理 {i+1}/{len(configs)}: {config.get('output_path', '不明')}")
                result = self.compose_single_video(config)
                results.append(result)
            except Exception as e:
                logger.error(f"バッチ処理 {i+1} でエラー: {str(e)}")
                results.append(None)
        
        success_count = sum(1 for r in results if r is not None)
        logger.info(f"バッチ処理完了: {success_count}/{len(configs)} 成功")
        
        return results
    
    def _validate_config(self, config: Dict[str, Any]) -> None:
        """設定の検証"""
        required_fields = ["audio_file", "output_path"]
        
        for field in required_fields:
            if field not in config:
                raise ValueError(f"必須フィールドが不足: {field}")
        
        # ファイル存在確認
        if not os.path.exists(config["audio_file"]):
            raise FileNotFoundError(f"音声ファイルが見つかりません: {config['audio_file']}")
        
        # 出力ディレクトリの作成
        output_dir = os.path.dirname(config["output_path"])
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
    
    def _load_audio(self, audio_path: str) -> AudioFileClip:
        """音声ファイルを読み込み"""
        try:
            audio_clip = AudioFileClip(audio_path)
            logger.info(f"音声読み込み完了: {audio_path} ({audio_clip.duration:.2f}秒)")
            return audio_clip
        except Exception as e:
            raise Exception(f"音声ファイル読み込みエラー: {str(e)}")
    
    def _prepare_background(self, background_path: Optional[str], duration: float, settings: Dict[str, Any]) -> VideoFileClip:
        """背景動画を準備"""
        bg_settings = {**self.default_settings["background"], **settings.get("background", {})}
        
        if background_path and os.path.exists(background_path):
            try:
                # 指定された背景動画を使用
                background = VideoFileClip(background_path)
                
                # 長さの調整
                if background.duration < duration:
                    if bg_settings["loop"]:
                        # ループ再生
                        loop_count = int(duration / background.duration) + 1
                        background = concatenate_videoclips([background] * loop_count)
                
                background = background.subclip(0, duration)
                
                # 解像度調整
                target_resolution = self.default_settings["video"]["resolution"]
                background = background.resize(target_resolution)
                
                # 音量調整（背景動画に音声がある場合）
                if background.audio is not None:
                    background = background.set_audio(
                        background.audio.volumex(bg_settings["volume"])
                    )
                
                logger.info(f"背景動画読み込み完了: {background_path}")
                return background
                
            except Exception as e:
                logger.warning(f"背景動画読み込み失敗、単色背景を使用: {str(e)}")
        
        # デフォルト背景（単色）
        return self._create_default_background(duration)
    
    def _create_default_background(self, duration: float) -> ColorClip:
        """デフォルト背景を作成"""
        resolution = self.default_settings["video"]["resolution"]
        # 野球場を連想させる緑色
        background = ColorClip(size=resolution, color=(34, 139, 34), duration=duration)
        logger.info("デフォルト背景（緑色）を作成")
        return background
    
    def _prepare_subtitle(
        self, 
        subtitle_image_path: Optional[str], 
        text: str, 
        duration: float,
        settings: Dict[str, Any]
    ) -> Optional[ImageClip]:
        """字幕クリップを準備"""
        subtitle_settings = {**self.default_settings["subtitle"], **settings.get("subtitle", {})}
        
        if subtitle_image_path and os.path.exists(subtitle_image_path):
            try:
                # 字幕画像を使用
                subtitle_clip = ImageClip(subtitle_image_path, duration=duration)
                
                # ポジション設定
                position = self._get_subtitle_position(subtitle_settings)
                subtitle_clip = subtitle_clip.set_position(position)
                
                # フェード効果
                fade_dur = subtitle_settings["fade_duration"]
                if fade_dur > 0:
                    subtitle_clip = subtitle_clip.fadein(fade_dur).fadeout(fade_dur)
                
                logger.info(f"字幕画像読み込み完了: {subtitle_image_path}")
                return subtitle_clip
                
            except Exception as e:
                logger.warning(f"字幕画像読み込み失敗、テキスト字幕を使用: {str(e)}")
        
        # フォールバック：テキスト字幕
        if text:
            return self._create_text_subtitle(text, duration, subtitle_settings)
        
        return None
    
    def _get_subtitle_position(self, settings: Dict[str, Any]) -> Tuple[str, int]:
        """字幕の位置を取得"""
        position = settings.get("position", "bottom")
        margin = settings.get("margin", 50)
        
        position_map = {
            "top": ("center", margin),
            "center": "center",
            "bottom": ("center", f"h-{margin}-subtitle_height")
        }
        
        return position_map.get(position, "center")
    
    def _create_text_subtitle(self, text: str, duration: float, settings: Dict[str, Any]) -> TextClip:
        """テキスト字幕を作成"""
        try:
            subtitle_clip = TextClip(
                text,
                fontsize=48,
                color='white',
                font='Arial',
                stroke_color='black',
                stroke_width=2
            ).set_duration(duration)
            
            position = self._get_subtitle_position(settings)
            subtitle_clip = subtitle_clip.set_position(position)
            
            logger.info("テキスト字幕を作成")
            return subtitle_clip
            
        except Exception as e:
            logger.warning(f"テキスト字幕作成失敗: {str(e)}")
            return None
    
    def _compose_final_video(
        self,
        background: VideoFileClip,
        subtitle: Optional[ImageClip],
        audio: AudioFileClip,
        settings: Dict[str, Any]
    ) -> CompositeVideoClip:
        """最終動画を合成"""
        clips = [background]
        
        if subtitle is not None:
            clips.append(subtitle)
        
        # 動画合成
        final_video = CompositeVideoClip(clips)
        
        # 音声設定
        final_audio = audio
        if background.audio is not None:
            # 背景音と音声を合成
            final_audio = CompositeAudioClip([audio, background.audio])
        
        final_video = final_video.set_audio(final_audio)
        
        logger.info("動画合成完了")
        return final_video
    
    def _export_video(self, video: CompositeVideoClip, output_path: str, settings: Dict[str, Any]) -> str:
        """動画を出力"""
        try:
            video_settings = {**self.default_settings["video"], **settings.get("video", {})}
            
            # 出力設定
            codec = video_settings.get("codec", "libx264")
            fps = video_settings.get("fps", 30)
            bitrate = video_settings.get("bitrate", "5000k")
            audio_codec = video_settings.get("audio_codec", "aac")
            
            # ファイル出力
            video.write_videofile(
                output_path,
                fps=fps,
                codec=codec,
                bitrate=bitrate,
                audio_codec=audio_codec,
                temp_audiofile=os.path.join(self.temp_dir, "temp_audio.m4a"),
                remove_temp=True,
                verbose=False,
                logger=None
            )
            
            logger.info(f"動画出力完了: {output_path}")
            return output_path
            
        except Exception as e:
            raise Exception(f"動画出力エラー: {str(e)}")
    
    def _cleanup_clips(self, clips: List[Any]) -> None:
        """クリップのクリーンアップ"""
        for clip in clips:
            if clip is not None:
                try:
                    clip.close()
                except:
                    pass  # エラーが発生しても継続
    
    def get_video_info(self, video_path: str) -> Dict[str, Any]:
        """動画情報を取得"""
        try:
            with VideoFileClip(video_path) as video:
                return {
                    "duration": video.duration,
                    "fps": video.fps,
                    "size": video.size,
                    "has_audio": video.audio is not None,
                    "file_size": os.path.getsize(video_path)
                }
        except Exception as e:
            logger.error(f"動画情報取得エラー: {str(e)}")
            return {}

def main():
    """メイン関数 - コマンドライン実行用"""
    if len(sys.argv) < 2:
        print("使用方法: python video_composer.py <config_json>")
        print("または: python video_composer.py <configs_json> --batch")
        sys.exit(1)
    
    try:
        # JSON設定を読み込み
        config_json = sys.argv[1]
        
        composer = VideoComposer()
        
        if len(sys.argv) > 2 and sys.argv[2] == "--batch":
            # バッチ処理
            configs = json.loads(config_json)
            results = composer.compose_batch_videos(configs)
            
            # 結果をJSON形式で出力
            output = {
                "success": True,
                "results": results,
                "total": len(configs),
                "success_count": sum(1 for r in results if r is not None)
            }
            print(json.dumps(output))
            
        else:
            # 単一処理
            config = json.loads(config_json)
            result = composer.compose_single_video(config)
            
            # 結果をJSON形式で出力
            output = {
                "success": True,
                "output_path": result
            }
            print(json.dumps(output))
    
    except Exception as e:
        # エラーをJSON形式で出力
        error_output = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == "__main__":
    main()