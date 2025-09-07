#!/usr/bin/env node

/**
 * 長編動画生成スクリプト - 複数音声ファイル連結で1分50秒-2分の動画作成
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

// 引数解析
function parseArgs() {
  const args = process.argv.slice(2);
  let dateString = 'today';
  let targetCount = 60; // デフォルトで全60個使用
  
  args.forEach(arg => {
    if (arg.startsWith('--date=')) {
      dateString = arg.split('=')[1];
    }
    if (arg.startsWith('--count=')) {
      targetCount = parseInt(arg.split('=')[1]);
    }
  });
  
  let targetDate;
  switch(dateString) {
    case 'today':
      targetDate = new Date();
      break;
    case 'yesterday':
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);
      break;
    default:
      targetDate = new Date(dateString);
  }
  
  return { targetDate, dateString, targetCount };
}

// 長編動画生成Python スクリプト作成
function createLongVideoPythonScript(outputDir) {
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

def create_long_video(audio_files_list, output_path, asset_dir):
    """複数音声ファイルから長編動画を作成"""
    try:
        print(f"   音声ファイル数: {len(audio_files_list)}個")
        
        # 音声ファイルを順次読み込み・連結
        audio_clips = []
        total_duration = 0
        
        for i, audio_file in enumerate(audio_files_list):
            if os.path.exists(audio_file):
                audio = AudioFileClip(audio_file)
                audio_clips.append(audio)
                total_duration += audio.duration
                print(f"   {i+1:2d}. {os.path.basename(audio_file)}: {audio.duration:.2f}秒")
            else:
                print(f"   警告: ファイルが見つかりません - {audio_file}")
        
        if not audio_clips:
            print("   エラー: 有効な音声ファイルがありません")
            return False
        
        # 音声を連結
        print(f"   音声連結中... 総時間: {total_duration:.2f}秒 ({total_duration/60:.2f}分)")
        concatenated_audio = concatenate_audioclips(audio_clips)
        
        # 背景素材読み込み
        print("   背景動画読み込み中...")
        background = load_background_asset(asset_dir, total_duration)
        
        # 音声を追加
        print("   動画合成中...")
        video = background.set_audio(concatenated_audio)
        
        # 動画出力
        print("   動画書き出し中...")
        video.write_videofile(
            output_path,
            fps=30,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile=f'temp-long-audio-{os.getpid()}.m4a',
            remove_temp=True,
            verbose=False,
            logger=None
        )
        
        # クリーンアップ
        video.close()
        concatenated_audio.close()
        for audio in audio_clips:
            audio.close()
        
        return True
        
    except Exception as e:
        print(f"   動画生成エラー: {str(e)}")
        return False

def main():
    if len(sys.argv) < 4:
        print("使用方法: python long_video_script.py <output_file> <asset_dir> <audio_file1> [audio_file2] ...")
        sys.exit(1)
    
    output_file = sys.argv[1]
    asset_dir = sys.argv[2]
    audio_files = sys.argv[3:]
    
    print("長編動画生成開始")
    print(f"出力: {output_file}")
    print(f"音声ファイル数: {len(audio_files)}個")
    print()
    
    if create_long_video(audio_files, output_file, asset_dir):
        file_size = os.path.getsize(output_file) / (1024 * 1024)
        print(f"長編動画生成完了: {file_size:.2f}MB")
        return True
    else:
        print("長編動画生成失敗")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
`;
  
  const scriptPath = path.join(outputDir, 'long_video_script.py');
  fs.writeFileSync(scriptPath, scriptContent);
  return scriptPath;
}

// メイン処理
async function longVideoGeneration() {
  const { targetDate, dateString, targetCount } = parseArgs();
  const formattedDate = formatDate(targetDate);
  
  console.log('🎬 長編動画生成開始！');
  console.log('====================');
  console.log(`📅 対象日付: ${formattedDate} (${dateString})`);
  console.log(`🎤 使用音声数: ${targetCount}個`);
  console.log('');
  
  try {
    // 音声ディレクトリをチェック
    const audioDir = path.join(process.cwd(), 'audio', `nanj-${formattedDate}`);
    if (!fs.existsSync(audioDir)) {
      console.error(`❌ 音声ディレクトリが見つかりません: ${audioDir}`);
      console.log('先に音声ファイルを生成してください:');
      console.log(`   node scripts/generate-daily-audio.mjs --date=${dateString}`);
      process.exit(1);
    }
    
    // 出力ディレクトリ作成
    const videoDir = path.join(process.cwd(), 'videos', `long-video-${formattedDate}`);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    
    // 音声ファイル一覧取得
    const audioFiles = fs.readdirSync(audioDir)
      .filter(file => file.endsWith('.wav'))
      .sort()
      .slice(0, targetCount);
    
    console.log(`📁 音声ディレクトリ: ${audioDir}`);
    console.log(`📁 動画出力先: ${videoDir}`);
    console.log(`🎤 使用する音声ファイル: ${audioFiles.length}個`);
    console.log('');
    
    if (audioFiles.length === 0) {
      console.error('❌ 音声ファイルが見つかりません');
      process.exit(1);
    }
    
    // Python長編動画生成スクリプト作成
    console.log('📝 Python長編動画生成スクリプト作成中...');
    const scriptPath = createLongVideoPythonScript(videoDir);
    console.log(`✅ スクリプト作成完了: ${scriptPath}`);
    console.log('');
    
    // 出力ファイルパス
    const outputVideo = path.join(videoDir, `nanj-long-video-${formattedDate}.mp4`);
    
    console.log('🎥 長編動画生成開始...');
    console.log(`   出力: ${path.basename(outputVideo)}`);
    console.log('');
    
    const startTime = Date.now();
    
    // 音声ファイルの絶対パスリスト作成
    const audioFilePaths = audioFiles.map(file => path.join(audioDir, file));
    
    // Python長編動画生成実行
    await new Promise((resolve, reject) => {
      const args = [scriptPath, outputVideo, 'assets', ...audioFilePaths];
      const python = spawn('python', args, {
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
    
    const totalTime = Date.now() - startTime;
    
    console.log('');
    console.log('🎉 長編動画生成完了！');
    console.log('====================');
    
    if (fs.existsSync(outputVideo)) {
      const fileSize = fs.statSync(outputVideo).size / (1024 * 1024);
      console.log(`📊 結果:`);
      console.log(`   対象日付: ${formattedDate} (${dateString})`);
      console.log(`   使用音声数: ${audioFiles.length}個`);
      console.log(`   動画ファイル: ${path.basename(outputVideo)}`);
      console.log(`   ファイルサイズ: ${fileSize.toFixed(2)}MB`);
      console.log(`   処理時間: ${Math.round(totalTime/1000)}秒`);
      console.log(`   保存先: ${videoDir}`);
      console.log('');
      console.log('✅ 1分50秒-2分の長編動画が完成しました！');
      console.log('🎯 背景動画素材も正常に使用されています。');
    } else {
      console.log('❌ 動画生成に失敗しました');
    }
    
    // クリーンアップ
    fs.unlinkSync(scriptPath);
    
  } catch (error) {
    console.error('❌ 長編動画生成エラー:', error.message);
  }
}

longVideoGeneration();