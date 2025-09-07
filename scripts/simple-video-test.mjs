#!/usr/bin/env node

/**
 * 簡単な動画生成テスト - Canvasなしでテスト
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// 日付フォーマット関数
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 簡単なPython動画生成スクリプト
function createSimpleVideoPythonScript(outputDir) {
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

def create_simple_video(audio_path, output_path):
    """音声から簡単な動画を作成"""
    try:
        # 音声ファイル読み込み
        audio = AudioFileClip(audio_path)
        duration = audio.duration
        
        print(f"   音声: {os.path.basename(audio_path)} ({duration:.2f}秒)")
        
        # 背景動画作成
        background = create_simple_background(duration)
        
        # 音声を追加
        video = background.set_audio(audio)
        
        # 動画出力
        video.write_videofile(
            output_path,
            fps=30,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile=f'temp-audio.m4a',
            remove_temp=True,
            verbose=False,
            logger=None
        )
        
        # クリーンアップ
        video.close()
        audio.close()
        
        return True
        
    except Exception as e:
        print(f"   ❌ 動画生成エラー: {str(e)}")
        return False

def main():
    if len(sys.argv) != 4:
        print("使用方法: python simple_video_test.py <audio_file> <output_file> <asset_dir>")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    output_file = sys.argv[2]
    asset_dir = sys.argv[3]
    
    print(f"🎥 簡単動画テスト開始")
    print(f"音声: {audio_file}")
    print(f"出力: {output_file}")
    print()
    
    if create_simple_video(audio_file, output_file):
        file_size = os.path.getsize(output_file) / (1024 * 1024)
        print(f"✅ 動画生成完了: {file_size:.2f}MB")
        return True
    else:
        print("❌ 動画生成失敗")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
`;
  
  const scriptPath = path.join(outputDir, 'simple_video_test.py');
  fs.writeFileSync(scriptPath, scriptContent);
  return scriptPath;
}

// メイン処理
async function simpleVideoTest() {
  const targetDate = new Date();
  const formattedDate = formatDate(targetDate);
  
  console.log('🎥 簡単動画生成テスト開始！');
  console.log('===============================');
  console.log(`📅 対象日付: ${formattedDate}`);
  console.log('');
  
  try {
    // 音声ディレクトリをチェック
    const audioDir = path.join(process.cwd(), 'audio', `nanj-${formattedDate}`);
    if (!fs.existsSync(audioDir)) {
      console.error(`❌ 音声ディレクトリが見つかりません: ${audioDir}`);
      console.log('先に音声ファイルを生成してください:');
      console.log(`node scripts/generate-daily-audio.mjs --date=today`);
      process.exit(1);
    }
    
    // 出力ディレクトリ作成
    const videoDir = path.join(process.cwd(), 'videos', `test-${formattedDate}`);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    
    // 音声ファイル一覧取得（最初の3個をテスト）
    const audioFiles = fs.readdirSync(audioDir).filter(file => file.endsWith('.wav')).slice(0, 3);
    
    console.log(`📁 音声ディレクトリ: ${audioDir}`);
    console.log(`📁 動画出力先: ${videoDir}`);
    console.log(`🎤 テスト用音声ファイル: ${audioFiles.length}個`);
    console.log('');
    
    // Python動画生成スクリプト作成
    console.log('📝 Python動画生成スクリプト作成中...');
    const scriptPath = createSimpleVideoPythonScript(videoDir);
    console.log(`✅ スクリプト作成完了: ${scriptPath}`);
    console.log('');
    
    let successCount = 0;
    const startTime = Date.now();
    
    // 各音声ファイルに対して動画生成テスト
    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      const audioPath = path.join(audioDir, audioFile);
      const videoFile = audioFile.replace('.wav', '_test.mp4');
      const videoPath = path.join(videoDir, videoFile);
      
      console.log(`🎥 ${i+1}/${audioFiles.length}: ${videoFile}`);
      
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
          console.log(`   ✅ 生成完了: ${file_size.toFixed(2)}MB`);
          successCount++;
        }
        
      } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
      }
      
      console.log('');
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log('🎉 簡単動画生成テスト完了！');
    console.log('===============================');
    console.log(`📊 結果:`);
    console.log(`   テスト数: ${audioFiles.length}個`);
    console.log(`   成功数: ${successCount}個`);
    console.log(`   成功率: ${Math.round((successCount/audioFiles.length)*100)}%`);
    console.log(`   処理時間: ${Math.round(totalTime/1000)}秒`);
    console.log(`   保存先: ${videoDir}`);
    
    if (successCount > 0) {
      console.log('');
      console.log('✅ 基本的な動画生成システムは動作しています！');
      console.log('🎯 次のステップで完全なシステムを構築できます。');
    }
    
    // クリーンアップ
    fs.unlinkSync(scriptPath);
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
  }
}

simpleVideoTest();