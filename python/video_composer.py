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
        VideoFileClip, AudioFileClip, ImageClip, CompositeVideoClip, CompositeAudioClip,
        TextClip, ColorClip, concatenate_videoclips
    )
    from moviepy.video.fx import resize, fadeout, fadein
    from moviepy.audio.fx import audio_fadeout, audio_fadein
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    # from .performance_optimizer import PerformanceOptimizer
    # パフォーマンス最適化は一時的に無効化
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
        # self.performance_optimizer = PerformanceOptimizer()  # 一時的に無効化
    
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
    
    def compose_theme_video(self, theme_config: Dict[str, Any]) -> str:
        """
        テーマごとの動画を合成（20個の音声+吹き出しを1つの動画に統合）

        Args:
            theme_config: テーマ動画合成設定
                - theme_name: テーマ名
                - audio_files: 音声ファイルのリスト（20個）
                - texts: 対応するテキストのリスト（20個）
                - subtitle_images: 字幕画像パスのリスト（オプション）
                - output_path: 出力パス
                - settings: 追加設定

        Returns:
            str: 出力動画のパス
        """
        # パフォーマンス最適化は一時的に無効化
        try:
            logger.info(f"テーマ動画合成開始: {theme_config.get('theme_name', '不明')}")

            # 処理前バリデーション（簡略化）
            # if not optimizer.pre_process_validation(theme_config):
            #     raise Exception("処理前バリデーション失敗")

            # 設定の検証
            self._validate_theme_config(theme_config)

            # 設定を取得（最適化は一時的に無効化）
            optimized_settings = theme_config.get("settings", {}).copy()
            audio_files = theme_config["audio_files"]

            # 基本設定を使用
            if "video" not in optimized_settings:
                optimized_settings["video"] = {}
            # optimized_settings["audio"] = audio_opts

            # 音声クリップの読み込みと結合
            combined_audio, audio_timings = self._combine_theme_audios(theme_config["audio_files"])

            # 背景動画の準備
            background_clip = self._prepare_background(
                theme_config.get("background_video"),
                combined_audio.duration,
                optimized_settings
            )

            # 複数吹き出しクリップの準備（一時的に無効化してまず音声のみテスト）
            subtitle_clips = []
                # subtitle_clips = self._prepare_title_and_subtitles(
                #     theme_config.get("theme_name", "テーマ"),
                #     theme_config.get("subtitle_images", []),
                #     theme_config.get("texts", []),
                #     audio_timings,
                #     optimized_settings
            # )

            # 動画の合成
            final_video = self._compose_theme_final_video(
                background_clip,
                subtitle_clips,
                combined_audio,
                optimized_settings
            )

            # 出力
            output_path = self._export_video(final_video, theme_config["output_path"], optimized_settings)

            # クリーンアップ
            clips_to_cleanup = [background_clip, combined_audio, final_video] + subtitle_clips
            self._cleanup_clips(clips_to_cleanup)

            # パフォーマンスレポート（一時的に無効化）
            # report = optimizer.get_performance_report()
            # logger.info(f"パフォーマンス詳細 - 総実行時間: {report['total_execution_time']:.2f}秒, "
            #           f"メモリ使用量: {report['total_memory_usage_gb']:.2f}GB")

            logger.info(f"テーマ動画合成完了: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"テーマ動画合成エラー: {str(e)}")
            logger.error(traceback.format_exc())
            raise Exception(f"テーマ動画合成に失敗しました: {str(e)}")

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
        """背景動画を準備（ランダム選択対応）"""
        bg_settings = {**self.default_settings["background"], **settings.get("background", {})}
        
        # ランダム背景動画選択機能
        if not background_path or background_path == "random":
            background_path = self._select_random_background_video()
        
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

                # 解像度調整 - PIL.Image.ANTIALIAS問題を回避
                target_resolution = self.default_settings["video"]["resolution"]
                try:
                    # MoviePy resizeメソッドの代わりに、サイズ調整をスキップ
                    # 多くの動画が既に1920x1080なので、リサイズは必須ではない
                    if background.size != target_resolution:
                        logger.info(f"背景動画サイズ: {background.size} -> {target_resolution} (リサイズスキップ)")
                        # リサイズしないで元のサイズを使用（品質を保持）
                    else:
                        logger.info(f"背景動画サイズ: {background.size} (リサイズ不要)")
                except Exception as resize_error:
                    logger.warning(f"リサイズ処理エラー（無視して続行）: {str(resize_error)}")

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
    
    def _select_random_background_video(self) -> Optional[str]:
        """背景動画フォルダからランダムに1つ選択"""
        import random
        import glob
        
        # 背景動画フォルダのパス
        background_video_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "backgrounds", "videos")
        background_video_path = os.path.abspath(background_video_dir)
        
        # 動画ファイルを検索（mp4, avi, mov形式）
        video_patterns = [
            os.path.join(background_video_path, "*.mp4"),
            os.path.join(background_video_path, "*.avi"), 
            os.path.join(background_video_path, "*.mov")
        ]
        
        video_files = []
        for pattern in video_patterns:
            video_files.extend(glob.glob(pattern))
        
        if not video_files:
            logger.warning("背景動画ファイルが見つかりません")
            return None
            
        # ランダムに1つ選択
        selected_video = random.choice(video_files)
        logger.info(f"ランダム背景動画選択: {os.path.basename(selected_video)}")
        return selected_video
    
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
    
    def _get_subtitle_position(self, settings: Dict[str, Any]) -> str:
        """字幕の位置を取得（簡略化）"""
        position = settings.get("position", "bottom")
        
        position_map = {
            "top": "top",
            "center": "center",
            "bottom": "bottom"
        }
        
        return position_map.get(position, "bottom")
    
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
    
    def _validate_theme_config(self, config: Dict[str, Any]) -> None:
        """テーマ設定の検証"""
        required_fields = ["audio_files", "output_path"]
        
        for field in required_fields:
            if field not in config:
                raise ValueError(f"必須フィールドが不足: {field}")
        
        # 音声ファイルリストの確認
        audio_files = config["audio_files"]
        if not isinstance(audio_files, list) or len(audio_files) == 0:
            raise ValueError("audio_filesは空でないリストである必要があります")
        
        # ファイル存在確認
        for i, audio_file in enumerate(audio_files):
            if not os.path.exists(audio_file):
                raise FileNotFoundError(f"音声ファイルが見つかりません[{i}]: {audio_file}")
        
        # テキスト数の整合性確認
        texts = config.get("texts", [])
        if texts and len(texts) != len(audio_files):
            raise ValueError(f"テキスト数({len(texts)})と音声ファイル数({len(audio_files)})が一致しません")
        
        # 出力ディレクトリの作成
        output_dir = os.path.dirname(config["output_path"])
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
    
    def _combine_theme_audios(self, audio_files: List[str]) -> Tuple[AudioFileClip, List[Tuple[float, float]]]:
        """テーマの音声ファイルを結合（1分40秒固定・均等配置）"""
        try:
            TARGET_DURATION = 100.0  # 1分40秒固定
            
            # 21等分（タイトル1個 + コメント20個）
            segment_duration = TARGET_DURATION / 21  # 約4.76秒ずつ
            
            timings = []
            positioned_audio_clips = []
            
            # タイトル音声セグメント（最初の4.76秒）
            title_audio_file = None
            
            # タイトル音声ファイルを探索
            import glob
            audio_dir = os.path.dirname(audio_files[0]) if audio_files else '.'
            
            # テーマ番号を推測（音声ファイル名から）
            theme_num = 1
            if audio_files:
                filename = os.path.basename(audio_files[0])
                if 'theme2' in filename:
                    theme_num = 2
                elif 'theme3' in filename:
                    theme_num = 3
            
            # テーマごとの特定タイトル音声ファイル名
            theme_title_files = {
                1: 'title_gekiteki.wav',
                2: 'title_shushin_fail.wav', 
                3: 'title_shinjin_katsuyaku.wav'
            }
            
            specific_title_file = theme_title_files.get(theme_num, 'title_gekiteki.wav')
            
            title_patterns = [
                os.path.join(audio_dir, specific_title_file),  # テーマ固有のタイトル
                os.path.join(audio_dir, 'title_*.wav'),
                os.path.join(audio_dir, '*title*.wav'),
                # フォールバック: 最初のコメント音声をタイトルとして使用
                audio_files[0] if audio_files else None
            ]
            
            for pattern in title_patterns[:2]:  # patternファイル検索
                matches = glob.glob(pattern)
                if matches:
                    title_audio_file = matches[0]
                    break
            
            if not title_audio_file and audio_files:
                # フォールバック: 最初のコメント音声をタイトルに流用
                title_audio_file = audio_files[0]
                logger.info(f"タイトル音声未発見、フォールバック使用: {title_audio_file}")
            
            if title_audio_file and os.path.exists(title_audio_file):
                # 実際のタイトル音声を使用
                title_audio = AudioFileClip(title_audio_file)
                if title_audio.duration > segment_duration:
                    title_audio = title_audio.subclip(0, segment_duration)
                
                positioned_audio_clips.append(title_audio.set_start(0))
                logger.info(f"タイトル音声配置: {title_audio_file} (0.0s-{segment_duration:.2f}s)")
            else:
                # フォールバック: 無音
                from moviepy.editor import AudioClip
                title_silence = AudioClip(make_frame=lambda t: [0, 0], duration=segment_duration)
                positioned_audio_clips.append(title_silence.set_start(0))
                logger.info(f"タイトル用無音セグメント作成: 0.0s-{segment_duration:.2f}s")
                
            timings.append((0, segment_duration))
            
            # 20個の音声ファイルを100秒全体に均等配置
            for i, audio_file in enumerate(audio_files):
                original_audio = AudioFileClip(audio_file)
                
                # 各セグメントの開始時間を計算
                segment_start = (i + 1) * segment_duration
                segment_end = segment_start + segment_duration
                
                # 音声を必要に応じて調整
                if original_audio.duration > segment_duration:
                    # 長い場合は切り詰め
                    adjusted_audio = original_audio.subclip(0, segment_duration)
                else:
                    # 短い場合はそのまま使用
                    adjusted_audio = original_audio
                
                # 音声を正確な位置に配置
                positioned_audio = adjusted_audio.set_start(segment_start)
                positioned_audio_clips.append(positioned_audio)
                
                # タイミング情報を記録
                timings.append((segment_start, segment_end))
                
                logger.info(f"音声[{i+1}]配置: {audio_file} ({segment_start:.2f}s-{segment_end:.2f}s)")
                # original_audio.close()  # 後でクリーンアップ
            
            # 100秒の完全な音声トラックを作成
            from moviepy.editor import CompositeAudioClip
            combined_audio = CompositeAudioClip(positioned_audio_clips).set_duration(TARGET_DURATION)
            
            logger.info(f"音声結合完了: 総時間 {combined_audio.duration:.2f}秒 (目標: {TARGET_DURATION}秒)")
            logger.info(f"21個セグメント配置: タイトル1個 + コメント20個")
            return combined_audio, timings
            
        except Exception as e:
            raise Exception(f"音声結合エラー: {str(e)}")
    
    def _prepare_title_and_subtitles(
        self,
        theme_name: str,
        subtitle_images: List[str], 
        texts: List[str], 
        timings: List[Tuple[float, float]],
        settings: Dict[str, Any]
    ) -> List[ImageClip]:
        """タイトル + 複数の吹き出し字幕を準備（計21個）"""
        subtitle_clips = []
        
        try:
            for i, (start_time, end_time) in enumerate(timings):
                duration = end_time - start_time
                
                if i == 0:
                    # 最初はタイトル吹き出し
                    text = theme_name
                    logger.info(f"タイトル吹き出し準備: '{text}' ({start_time:.1f}s-{end_time:.1f}s)")
                    
                    # タイトル専用の大きな吹き出しを画面中央に配置
                    subtitle_clip = self._create_title_subtitle(text, duration, settings)
                    if subtitle_clip is not None:
                        subtitle_clip = subtitle_clip.set_start(start_time)
                        subtitle_clip = subtitle_clip.set_position('center')
                        subtitle_clips.append(subtitle_clip)
                        
                else:
                    # 2番目以降はコメント吹き出し
                    comment_index = i - 1  # タイトルを除くインデックス
                    text = texts[comment_index] if comment_index < len(texts) else f"コメント{comment_index + 1}"
                    subtitle_image = subtitle_images[comment_index] if comment_index < len(subtitle_images) else None
                    
                    subtitle_clip = self._prepare_subtitle(
                        subtitle_image, 
                        text, 
                        duration, 
                        settings
                    )
                    
                    if subtitle_clip is not None:
                        # 表示タイミングを設定
                        subtitle_clip = subtitle_clip.set_start(start_time)
                        
                        # コメント吹き出し位置の自動配置（重複回避）
                        position = self._calculate_comment_subtitle_position(comment_index, len(timings) - 1, settings)
                        subtitle_clip = subtitle_clip.set_position(position)
                        
                        subtitle_clips.append(subtitle_clip)
                        logger.info(f"吹き出し[{comment_index + 1}]準備完了: {start_time:.1f}s-{end_time:.1f}s")
            
            logger.info(f"全吹き出し準備完了: {len(subtitle_clips)}個 (タイトル1個 + コメント{len(subtitle_clips) - 1}個)")
            return subtitle_clips
            
        except Exception as e:
            raise Exception(f"吹き出し準備エラー: {str(e)}")
    
    def _prepare_multiple_subtitles(
        self, 
        subtitle_images: List[str], 
        texts: List[str], 
        timings: List[Tuple[float, float]],
        settings: Dict[str, Any]
    ) -> List[ImageClip]:
        """複数の吹き出し字幕を準備"""
        subtitle_clips = []
        
        try:
            for i, (start_time, end_time) in enumerate(timings):
                duration = end_time - start_time
                
                # 字幕画像または文字による字幕作成
                subtitle_image = subtitle_images[i] if i < len(subtitle_images) else None
                text = texts[i] if i < len(texts) else f"コメント{i+1}"
                
                subtitle_clip = self._prepare_subtitle(
                    subtitle_image, 
                    text, 
                    duration, 
                    settings
                )
                
                if subtitle_clip is not None:
                    # 表示タイミングを設定
                    subtitle_clip = subtitle_clip.set_start(start_time)
                    
                    # 吹き出し位置の自動配置（重複回避）
                    position = self._calculate_subtitle_position(i, len(timings), settings)
                    subtitle_clip = subtitle_clip.set_position(position)
                    
                    subtitle_clips.append(subtitle_clip)
                    logger.info(f"吹き出し[{i+1}]準備完了: {start_time:.1f}s-{end_time:.1f}s")
            
            logger.info(f"全吹き出し準備完了: {len(subtitle_clips)}個")
            return subtitle_clips
            
        except Exception as e:
            raise Exception(f"複数吹き出し準備エラー: {str(e)}")
    
    def _create_title_subtitle(self, title_text: str, duration: float, settings: Dict[str, Any]) -> TextClip:
        """タイトル専用の大きな字幕を作成"""
        try:
            title_clip = TextClip(
                title_text,
                fontsize=72,  # 大きなフォントサイズ
                color='white',
                font='Arial',
                stroke_color='red',  # 赤い縁取り
                stroke_width=4
            ).set_duration(duration)
            
            logger.info(f"タイトル字幕作成: '{title_text}'")
            return title_clip
            
        except Exception as e:
            logger.warning(f"タイトル字幕作成失敗: {str(e)}")
            return None
    
    def _calculate_comment_subtitle_position(
        self, 
        index: int, 
        total_count: int, 
        settings: Dict[str, Any]
    ) -> Tuple[int, int]:
        """コメント吹き出し位置の自動計算（重複回避）"""
        # 画面を格子状に分割して配置（20個のコメント用）
        cols = 4  # 横4列
        rows = 5  # 縦5行（20個を収容）
        
        col = index % cols
        row = (index // cols) % rows
        
        # 画面解像度
        screen_width, screen_height = self.default_settings["video"]["resolution"]
        
        # セクション サイズ
        section_width = screen_width // cols
        section_height = screen_height // rows
        
        # 位置計算（中央寄せ）
        x = col * section_width + section_width // 4
        y = row * section_height + section_height // 4
        
        logger.info(f"コメント吹き出し[{index+1}]位置: ({x}, {y})")
        return (x, y)
    
    def _calculate_subtitle_position(
        self, 
        index: int, 
        total_count: int, 
        settings: Dict[str, Any]
    ) -> Tuple[int, int]:
        """吹き出し位置の自動計算（重複回避）"""
        # 画面を格子状に分割して配置
        cols = 3  # 横3列
        rows = 7  # 縦7行（20個を収容）
        
        col = index % cols
        row = (index // cols) % rows
        
        # 画面解像度
        screen_width, screen_height = self.default_settings["video"]["resolution"]
        
        # セクション サイズ
        section_width = screen_width // cols
        section_height = screen_height // rows
        
        # 位置計算（中央寄せ）
        x = col * section_width + section_width // 4
        y = row * section_height + section_height // 4
        
        logger.info(f"吹き出し[{index+1}]位置: ({x}, {y})")
        return (x, y)
    
    def _compose_theme_final_video(
        self,
        background: VideoFileClip,
        subtitles: List[ImageClip],
        audio: AudioFileClip,
        settings: Dict[str, Any]
    ) -> CompositeVideoClip:
        """テーマの最終動画を合成"""
        clips = [background] + subtitles
        
        # 動画合成
        final_video = CompositeVideoClip(clips)
        
        # 音声設定
        final_audio = audio
        if background.audio is not None:
            # 背景音と音声を合成
            from moviepy.editor import CompositeAudioClip
            final_audio = CompositeAudioClip([audio, background.audio])
        
        final_video = final_video.set_audio(final_audio)
        
        logger.info("テーマ動画合成完了")
        return final_video
    
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