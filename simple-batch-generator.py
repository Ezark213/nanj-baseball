#!/usr/bin/env python3
"""
シンプルバッチ字幕付き動画生成スクリプト
nanj-baseball プロジェクト - AI コーディング原則 第1～4条準拠
"""

import os
import json
import subprocess
import time
from pathlib import Path

def main():
    print("=== シンプルバッチ字幕付き動画生成 ===")
    
    root_dir = Path(".")
    subtitle_dir = root_dir / "subtitles" / "nanj-2025-09-12-skia"
    audio_dir = root_dir / "audio" / "nanj-2025-09-12"
    output_dir = root_dir / "output" / "simple-batch-videos"
    python_script = root_dir / "python" / "video_composer.py"
    
    # 出力ディレクトリ作成
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # ファイル一覧取得
    subtitle_files = sorted([f for f in os.listdir(subtitle_dir) if f.endswith('.png') and 'theme' in f and 'comment' in f])
    audio_files = sorted([f for f in os.listdir(audio_dir) if f.endswith('.wav') and 'theme' in f and 'comment' in f])
    
    print("字幕ファイル数:", len(subtitle_files))
    print("音声ファイル数:", len(audio_files))
    
    # 処理するファイル数制限
    max_files = min(len(subtitle_files), len(audio_files), 10)
    print("処理対象:", max_files, "個")
    
    success_count = 0
    start_time = time.time()
    
    for i in range(max_files):
        print(f"\n[{i+1}/{max_files}] 生成中...")
        
        subtitle_file = subtitle_dir / subtitle_files[i]
        audio_file = audio_dir / audio_files[i]
        output_file = output_dir / f"video_{str(i+1).zfill(3)}.mp4"
        
        print("字幕:", subtitle_files[i][:50])
        print("音声:", audio_files[i][:50])
        print("出力:", output_file.name)
        
        # 設定作成
        config = {
            "text": "なんJ野球コメント",
            "audio_file": str(audio_file),
            "subtitle_image": str(subtitle_file),
            "output_path": str(output_file),
            "settings": {
                "video": {
                    "fps": 30,
                    "resolution": [1920, 1080],
                    "codec": "libx264",
                    "bitrate": "3000k"
                },
                "subtitle": {
                    "position": "bottom",
                    "margin": 100,
                    "fade_duration": 0.3
                },
                "background": {
                    "loop": True,
                    "volume": 0.05
                }
            }
        }
        
        # Python実行
        try:
            config_json = json.dumps(config, ensure_ascii=False)
            
            result = subprocess.run([
                'python', str(python_script), config_json
            ], capture_output=True, text=True, cwd=root_dir, timeout=180)
            
            if result.returncode == 0 and output_file.exists():
                file_size = output_file.stat().st_size / (1024 * 1024)
                print(f"成功 ({file_size:.2f}MB)")
                success_count += 1
            else:
                print("失敗:", result.stderr[:100])
                
        except Exception as e:
            print("エラー:", str(e)[:100])
        
        # 進捗表示
        progress = (i + 1) / max_files * 100
        print(f"進捗: {progress:.1f}%")
    
    # 結果表示
    total_time = time.time() - start_time
    print(f"\n=== 結果 ===")
    print(f"成功: {success_count}/{max_files}")
    print(f"実行時間: {total_time:.1f}秒")
    print(f"出力先: {output_dir}")
    
    # 生成されたファイル一覧
    if success_count > 0:
        print("\n生成されたファイル:")
        video_files = sorted(output_dir.glob("*.mp4"))
        for video_file in video_files[:5]:  # 最初の5個表示
            file_size = video_file.stat().st_size / (1024 * 1024)
            print(f"  {video_file.name} ({file_size:.2f}MB)")
    
    return success_count

if __name__ == "__main__":
    try:
        success_count = main()
        if success_count > 0:
            print("\n生成成功!")
        else:
            print("\n生成失敗")
            exit(1)
    except Exception as e:
        print("システムエラー:", e)
        exit(1)