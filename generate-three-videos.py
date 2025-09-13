#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import subprocess
import sys
from datetime import datetime

def load_analysis_data():
    """分析データを読み込み"""
    data_path = r"C:\Users\pukur\nanj-baseball\output\nanj-sites-2025-09-13\nanj-analysis-result.json"
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_single_video(topic_name, comment_text, video_number):
    """1つのビデオを生成"""
    print(f"ビデオ {video_number}: {topic_name} を生成中...")

    output_dir = r"C:\Users\pukur\nanj-baseball\output\three-videos"
    os.makedirs(output_dir, exist_ok=True)

    # ファイル名を短縮
    safe_topic = topic_name.replace("の", "").replace("から", "").replace("選手", "")[:10]
    output_path = os.path.join(output_dir, f"video_{video_number:03d}_{safe_topic}.mp4")

    # Pythonスクリプトを呼び出し
    cmd = [
        sys.executable,
        r"C:\Users\pukur\nanj-baseball\python\video_composer.py",
        comment_text,
        output_path
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        if result.returncode == 0:
            print(f"OK ビデオ {video_number} 生成成功: {os.path.basename(output_path)}")
            return True
        else:
            print(f"NG ビデオ {video_number} 生成失敗: {result.stderr}")
            return False
    except Exception as e:
        print(f"NG ビデオ {video_number} エラー: {str(e)}")
        return False

def main():
    print("=== 3つのビデオ生成開始 ===")

    # 分析データを読み込み
    data = load_analysis_data()

    # 各トピックから1つずつコメントを選択
    videos_to_generate = [
        {
            "topic": "劇的な逆転勝利",
            "comment": "あー今9回2死でダメかと思ったわ、やりやがった",
            "number": 1
        },
        {
            "topic": "守護神のセーブ失敗",
            "comment": "守護神がまさかのセーブ失敗で大荒れや",
            "number": 2
        },
        {
            "topic": "新人選手の活躍",
            "comment": "新人くんが決勝ホームラン打ってくれた！",
            "number": 3
        }
    ]

    success_count = 0

    for video_info in videos_to_generate:
        success = generate_single_video(
            video_info["topic"],
            video_info["comment"],
            video_info["number"]
        )
        if success:
            success_count += 1

    print(f"\n=== 生成完了 ===")
    print(f"成功: {success_count}/3")
    print(f"成功率: {success_count/3*100:.1f}%")

if __name__ == "__main__":
    main()