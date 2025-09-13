#!/usr/bin/env python3
"""
全量バッチ字幕付き動画生成スクリプト（全67個）
nanj-baseball プロジェクト - AI コーディング原則 第1～4条準拠
"""

import os
import json
import subprocess
import time
from pathlib import Path

def main():
    print("=== 全量バッチ字幕付き動画生成（全67個） ===")
    
    root_dir = Path(".")
    subtitle_dir = root_dir / "subtitles" / "nanj-2025-09-12-skia"
    audio_dir = root_dir / "audio" / "nanj-2025-09-12"
    output_dir = root_dir / "output" / "full-batch-videos-67"
    python_script = root_dir / "python" / "video_composer.py"
    
    # 出力ディレクトリ作成
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # ファイル一覧取得（コメントファイルのみ）
    subtitle_files = sorted([
        f for f in os.listdir(subtitle_dir) 
        if f.endswith('.png') and 'theme' in f and 'comment' in f
    ])
    audio_files = sorted([
        f for f in os.listdir(audio_dir) 
        if f.endswith('.wav') and 'theme' in f and 'comment' in f
    ])
    
    print("字幕ファイル数:", len(subtitle_files))
    print("音声ファイル数:", len(audio_files))
    
    # 全ファイル処理
    max_files = min(len(subtitle_files), len(audio_files))
    print("処理対象:", max_files, "個（全コメント）")
    
    success_count = 0
    error_count = 0
    start_time = time.time()
    
    # 結果記録用
    results = []
    
    for i in range(max_files):
        print(f"\n[{i+1}/{max_files}] 生成中...")
        
        subtitle_file = subtitle_dir / subtitle_files[i]
        audio_file = audio_dir / audio_files[i]
        
        # テキスト内容を推測
        text_content = "なんJ野球コメント"
        if "theme1" in subtitle_files[i]:
            text_content = "9回2死からの劇的逆転勝利"
        elif "theme2" in subtitle_files[i]:
            text_content = "守護神のまさかのセーブ失敗"
        elif "theme3" in subtitle_files[i]:
            text_content = "新人選手の決勝ホームラン"
        
        output_file = output_dir / f"video_{str(i+1).zfill(3)}_{text_content[:10]}.mp4"
        
        print("字幕:", subtitle_files[i][:60])
        print("音声:", audio_files[i][:60])
        print("出力:", output_file.name)
        
        # 設定作成
        config = {
            "text": text_content,
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
        video_start_time = time.time()
        try:
            config_json = json.dumps(config, ensure_ascii=False)
            
            result = subprocess.run([
                'python', str(python_script), config_json
            ], capture_output=True, text=True, cwd=root_dir, timeout=300)
            
            video_end_time = time.time()
            video_duration = video_end_time - video_start_time
            
            if result.returncode == 0 and output_file.exists():
                file_size = output_file.stat().st_size / (1024 * 1024)
                print(f"成功 ({file_size:.2f}MB, {video_duration:.1f}秒)")
                success_count += 1
                
                results.append({
                    "index": i + 1,
                    "status": "success",
                    "subtitle_file": subtitle_files[i],
                    "audio_file": audio_files[i],
                    "output_file": output_file.name,
                    "file_size_mb": round(file_size, 2),
                    "generation_time_sec": round(video_duration, 1),
                    "text_content": text_content
                })
            else:
                print("失敗:", result.stderr[:100])
                error_count += 1
                
                results.append({
                    "index": i + 1,
                    "status": "failed",
                    "subtitle_file": subtitle_files[i],
                    "audio_file": audio_files[i],
                    "error": result.stderr[:200],
                    "text_content": text_content
                })
                
        except Exception as e:
            video_end_time = time.time()
            print("エラー:", str(e)[:100])
            error_count += 1
            
            results.append({
                "index": i + 1,
                "status": "error",
                "subtitle_file": subtitle_files[i],
                "audio_file": audio_files[i],
                "error": str(e)[:200],
                "text_content": text_content
            })
        
        # 進捗表示
        progress = (i + 1) / max_files * 100
        elapsed_time = time.time() - start_time
        estimated_total_time = elapsed_time / (i + 1) * max_files
        remaining_time = estimated_total_time - elapsed_time
        
        print(f"進捗: {progress:.1f}% | 経過: {elapsed_time:.0f}秒 | 残り推定: {remaining_time:.0f}秒")
        
        # 10個ごとに中間結果表示
        if (i + 1) % 10 == 0:
            print(f"\n=== 中間結果 ({i + 1}/{max_files}) ===")
            print(f"成功: {success_count} | 失敗: {error_count}")
            print("=" * 40)
    
    # 最終結果
    total_time = time.time() - start_time
    print(f"\n=== 最終結果 ===")
    print(f"成功: {success_count}/{max_files}")
    print(f"失敗: {error_count}/{max_files}")
    print(f"成功率: {success_count/max_files*100:.1f}%")
    print(f"総実行時間: {total_time:.1f}秒 ({total_time/60:.1f}分)")
    print(f"平均生成時間: {total_time/max_files:.1f}秒/動画")
    print(f"出力先: {output_dir}")
    
    # 結果をJSONで保存
    summary = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_files": max_files,
        "success_count": success_count,
        "error_count": error_count,
        "success_rate_percent": round(success_count / max_files * 100, 1),
        "total_time_seconds": round(total_time, 1),
        "total_time_minutes": round(total_time / 60, 1),
        "average_time_per_video_seconds": round(total_time / max_files, 1),
        "output_directory": str(output_dir),
        "results": results
    }
    
    summary_path = output_dir / "full_batch_summary.json"
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"詳細サマリー保存: {summary_path}")
    
    # 成功した動画の統計
    if success_count > 0:
        successful_results = [r for r in results if r["status"] == "success"]
        total_size_mb = sum(r["file_size_mb"] for r in successful_results)
        avg_size_mb = total_size_mb / len(successful_results)
        
        print(f"\n動画統計:")
        print(f"  総サイズ: {total_size_mb:.1f}MB")
        print(f"  平均サイズ: {avg_size_mb:.2f}MB")
        print(f"  サイズ範囲: {min(r['file_size_mb'] for r in successful_results):.2f}MB - {max(r['file_size_mb'] for r in successful_results):.2f}MB")
        
        print(f"\n生成された動画（最初の10個）:")
        for result in successful_results[:10]:
            print(f"  {result['index']:2d}. {result['output_file']} ({result['file_size_mb']}MB)")
    
    return success_count, error_count

if __name__ == "__main__":
    try:
        success_count, error_count = main()
        if success_count > 0:
            print(f"\n全量バッチ生成完了! 成功: {success_count}個")
            if success_count >= 50:
                print("非常に成功率が高いです!")
        else:
            print("\n全量バッチ生成失敗")
            exit(1)
    except Exception as e:
        print("システムエラー:", e)
        exit(1)