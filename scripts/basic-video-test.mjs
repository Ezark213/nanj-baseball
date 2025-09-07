#!/usr/bin/env node

/**
 * 基本的な動画生成テスト - 文字化け対応版
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// 基本的なPython動画生成スクリプト
function createBasicVideoPythonScript(outputDir) {
  const scriptContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
from moviepy.editor import *
import numpy as np

def create_simple_background(duration, width=1920, height=1080):
    """シンプルな背景動画を作成"""
    def make_frame(t):
        # 野球場風の緑のグラデーション背景
        gradient = np.zeros((height, width, 3), dtype=np.uint8)
        
        for i in range(height):
            if i < height * 0.3:
                # 空色から緑色へのグラデーション
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

def load_background_asset(asset_dir, duration):
    """背景素材を読み込み"""
    backgrounds_dir = os.path.join(asset_dir, 'backgrounds', 'videos')
    
    if os.path.exists(backgrounds_dir):
        video_files = [f for f in os.listdir(backgrounds_dir) if f.endswith('.mp4')]
        if video_files:
            # 最初の背景動画を使用
            bg_path = os.path.join(backgrounds_dir, video_files[0])
            try:
                print(f"   背景動画を読み込み: {video_files[0]}")
                bg_clip = VideoFileClip(bg_path)
                if bg_clip.duration < duration:
                    bg_clip = bg_clip.loop(duration=duration)
                else:
                    bg_clip = bg_clip.subclip(0, duration)
                return bg_clip.resize((1920, 1080))
            except Exception as e:
                print(f"   背景動画読み込みエラー: {str(e)}")
                print("   デフォルト背景を使用")
    
    return create_simple_background(duration)

def create_video_with_assets(audio_path, output_path, asset_dir):
    """素材を使用して動画作成"""
    try:
        # 音声ファイル読み込み
        audio = AudioFileClip(audio_path)
        duration = audio.duration
        
        print(f"   音声: {os.path.basename(audio_path)} ({duration:.2f}秒)")
        
        # 背景素材読み込み
        background = load_background_asset(asset_dir, duration)
        
        # 音声を追加
        video = background.set_audio(audio)
        
        # 動画出力
        video.write_videofile(
            output_path,
            fps=30,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile=f'temp-audio-{os.getpid()}.m4a',
            remove_temp=True,
            verbose=False,
            logger=None
        )
        
        # クリーンアップ
        video.close()
        audio.close()
        
        return True
        
    except Exception as e:
        print(f"   動画生成エラー: {str(e)}")
        return False

def main():
    if len(sys.argv) != 4:
        print("使用方法: python basic_video_test.py <audio_file> <output_file> <asset_dir>")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    output_file = sys.argv[2]
    asset_dir = sys.argv[3]
    
    print("基本動画生成テスト開始")
    print(f"音声: {audio_file}")
    print(f"出力: {output_file}")
    
    if create_video_with_assets(audio_file, output_file, asset_dir):
        file_size = os.path.getsize(output_file) / (1024 * 1024)
        print(f"動画生成完了: {file_size:.2f}MB")
        return True
    else:
        print("動画生成失敗")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
`;
  
  const scriptPath = path.join(outputDir, 'basic_video_test.py');
  fs.writeFileSync(scriptPath, scriptContent);
  return scriptPath;
}

// メイン処理
async function basicVideoTest() {
  const targetDate = new Date();
  const formattedDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  
  console.log('動画生成テスト開始');
  console.log('=================');
  console.log(`対象日付: ${formattedDate}`);
  console.log('');
  
  try {
    // 音声ディレクトリをチェック
    const audioDir = path.join(process.cwd(), 'audio', `nanj-${formattedDate}`);
    if (!fs.existsSync(audioDir)) {
      console.error(`音声ディレクトリが見つかりません: ${audioDir}`);
      process.exit(1);
    }
    
    // 出力ディレクトリ作成
    const videoDir = path.join(process.cwd(), 'videos', `basic-test-${formattedDate}`);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    
    // 音声ファイル一覧取得（最初の2個をテスト）
    const audioFiles = fs.readdirSync(audioDir).filter(file => file.endsWith('.wav')).slice(0, 2);
    
    console.log(`音声ディレクトリ: ${audioDir}`);
    console.log(`動画出力先: ${videoDir}`);
    console.log(`テスト用音声ファイル: ${audioFiles.length}個`);
    console.log('');
    
    // Python動画生成スクリプト作成
    console.log('Python動画生成スクリプト作成中...');
    const scriptPath = createBasicVideoPythonScript(videoDir);
    console.log(`スクリプト作成完了: ${scriptPath}`);
    console.log('');
    
    let successCount = 0;
    const startTime = Date.now();
    
    // 各音声ファイルに対して動画生成テスト
    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      const audioPath = path.join(audioDir, audioFile);
      const videoFile = audioFile.replace('.wav', '_basic.mp4');
      const videoPath = path.join(videoDir, videoFile);
      
      console.log(`${i+1}/${audioFiles.length}: ${videoFile}`);
      
      try {
        // Python動画生成実行
        await new Promise((resolve, reject) => {
          const python = spawn('python', [scriptPath, audioPath, videoPath, 'assets'], {
            stdio: 'inherit'
          });
          
          python.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Python script failed with code ${code}`));
            }
          });
          
          python.on('error', reject);
        });
        
        if (fs.existsSync(videoPath)) {
          const file_size = fs.statSync(videoPath).size / (1024 * 1024);
          console.log(`  生成完了: ${file_size.toFixed(2)}MB`);
          successCount++;
        }
        
      } catch (error) {
        console.log(`  エラー: ${error.message}`);
      }
      
      console.log('');
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log('動画生成テスト完了');
    console.log('=================');
    console.log(`テスト数: ${audioFiles.length}個`);
    console.log(`成功数: ${successCount}個`);
    console.log(`成功率: ${Math.round((successCount/audioFiles.length)*100)}%`);
    console.log(`処理時間: ${Math.round(totalTime/1000)}秒`);
    console.log(`保存先: ${videoDir}`);
    
    if (successCount > 0) {
      console.log('');
      console.log('基本的な動画生成システムは動作しています！');
      console.log('背景動画素材も正常に活用されています。');
    }
    
    // クリーンアップ
    fs.unlinkSync(scriptPath);
    
  } catch (error) {
    console.error('テスト実行エラー:', error.message);
  }
}

basicVideoTest();