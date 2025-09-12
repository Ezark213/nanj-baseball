#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
from pathlib import Path
from moviepy.editor import *
import numpy as np

def create_background_clip(duration, width=1920, height=1080, bg_type='baseball'):
    """背景動画クリップを作成"""
    if bg_type == 'baseball':
        # 野球場風の緑のグラデーション背景
        def make_frame(t):
            # 緑色のグラデーション（野球場をイメージ）
            gradient = np.zeros((height, width, 3), dtype=np.uint8)
            
            for i in range(height):
                # 上部：空色から緑色へのグラデーション
                if i < height * 0.3:
                    # 空色 (135, 206, 235) から 明るい緑 (144, 238, 144)
                    ratio = i / (height * 0.3)
                    gradient[i, :, 0] = int(135 * (1 - ratio) + 144 * ratio)  # R
                    gradient[i, :, 1] = int(206 * (1 - ratio) + 238 * ratio)  # G  
                    gradient[i, :, 2] = int(235 * (1 - ratio) + 144 * ratio)  # B
                else:
                    # 緑のグラデーション
                    ratio = (i - height * 0.3) / (height * 0.7)
                    gradient[i, :, 0] = int(144 * (1 - ratio) + 34 * ratio)   # R
                    gradient[i, :, 1] = int(238 * (1 - ratio) + 139 * ratio)  # G
                    gradient[i, :, 2] = int(144 * (1 - ratio) + 34 * ratio)   # B
            
            return gradient
        
        return VideoClip(make_frame, duration=duration)
    
    elif bg_type == 'night':
        # 夜の球場風背景
        def make_frame(t):
            gradient = np.zeros((height, width, 3), dtype=np.uint8)
            
            for i in range(height):
                # 夜空から暗い緑へ
                if i < height * 0.4:
                    # 濃紺 (25, 25, 112) から 暗い緑 (0, 100, 0)
                    ratio = i / (height * 0.4)
                    gradient[i, :, 0] = int(25 * (1 - ratio) + 0 * ratio)
                    gradient[i, :, 1] = int(25 * (1 - ratio) + 100 * ratio) 
                    gradient[i, :, 2] = int(112 * (1 - ratio) + 0 * ratio)
                else:
                    # 暗い緑のグラデーション
                    ratio = (i - height * 0.4) / (height * 0.6)
                    gradient[i, :, 0] = int(0 * (1 - ratio) + 20 * ratio)
                    gradient[i, :, 1] = int(100 * (1 - ratio) + 80 * ratio)
                    gradient[i, :, 2] = int(0 * (1 - ratio) + 20 * ratio)
            
            return gradient
        
        return VideoClip(make_frame, duration=duration)
    
    else:
        # シンプルなグラデーション背景
        def make_frame(t):
            gradient = np.zeros((height, width, 3), dtype=np.uint8)
            
            for i in range(height):
                # 上から下へのグラデーション
                ratio = i / height
                gradient[i, :, 0] = int(50 * (1 - ratio) + 200 * ratio)
                gradient[i, :, 1] = int(100 * (1 - ratio) + 220 * ratio)
                gradient[i, :, 2] = int(200 * (1 - ratio) + 250 * ratio)
            
            return gradient
        
        return VideoClip(make_frame, duration=duration)

def create_single_video(audio_path, subtitle_path, output_path, bg_type='baseball'):
    """単一の動画を作成"""
    try:
        # 音声ファイル読み込み
        audio = AudioFileClip(audio_path)
        duration = audio.duration
        
        print(f"   音声: {os.path.basename(audio_path)} ({duration:.2f}秒)")
        
        # 背景動画作成
        background = create_background_clip(duration, bg_type=bg_type)
        
        # 字幕画像読み込み・配置
        if os.path.exists(subtitle_path):
            subtitle_img = ImageClip(subtitle_path, duration=duration)
            
            # 字幕を画面下部中央に配置
            subtitle_img = subtitle_img.set_position(('center', 0.75), relative=True)
            
            # 字幕のサイズを調整（画面幅の80%以下）
            img_width, img_height = subtitle_img.size
            screen_width = 1920
            
            if img_width > screen_width * 0.8:
                scale_factor = (screen_width * 0.8) / img_width
                subtitle_img = subtitle_img.resize(scale_factor)
            
            print(f"   字幕: {os.path.basename(subtitle_path)} ({img_width}x{img_height}px)")
            
            # 背景と字幕を合成
            video = CompositeVideoClip([background, subtitle_img])
        else:
            print(f"   ⚠️ 字幕ファイルが見つかりません: {subtitle_path}")
            video = background
        
        # 音声を追加
        video = video.set_audio(audio)
        
        # 動画出力（高品質設定）
        video.write_videofile(
            output_path,
            fps=30,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile='temp-audio.m4a',
            remove_temp=True,
            verbose=False,
            logger=None
        )
        
        # メモリクリーンアップ
        video.close()
        audio.close()
        
        return True
        
    except Exception as e:
        print(f"   ❌ 動画生成エラー: {str(e)}")
        return False

def main():
    import sys
    
    if len(sys.argv) != 4:
        print("使用方法: python video_batch_generator.py <audio_dir> <subtitle_dir> <output_dir>")
        sys.exit(1)
    
    audio_dir = sys.argv[1]
    subtitle_dir = sys.argv[2] 
    output_dir = sys.argv[3]
    bg_type = sys.argv[4] if len(sys.argv) > 4 else 'baseball'
    
    # 出力ディレクトリ作成
    os.makedirs(output_dir, exist_ok=True)
    
    # 音声ファイル一覧取得
    audio_files = [f for f in os.listdir(audio_dir) if f.endswith('.wav')]
    audio_files.sort()
    
    print(f"🎬 動画生成開始: {len(audio_files)}個のファイル")
    print(f"背景タイプ: {bg_type}")
    print()
    
    success_count = 0
    
    for i, audio_file in enumerate(audio_files):
        audio_path = os.path.join(audio_dir, audio_file)
        
        # 対応する字幕ファイルパス
        subtitle_file = audio_file.replace('.wav', '_subtitle.png')
        subtitle_path = os.path.join(subtitle_dir, subtitle_file)
        
        # 出力動画ファイルパス
        video_file = audio_file.replace('.wav', '_video.mp4')
        video_path = os.path.join(output_dir, video_file)
        
        print(f"🎥 {i+1}/{len(audio_files)}: {video_file}")
        
        if create_single_video(audio_path, subtitle_path, video_path, bg_type):
            file_size = os.path.getsize(video_path) / (1024 * 1024)  # MB
            print(f"   ✅ 生成完了: {file_size:.2f}MB")
            success_count += 1
        
        print()
    
    print(f"🎉 動画生成完了: {success_count}/{len(audio_files)}個成功")

if __name__ == "__main__":
    main()
