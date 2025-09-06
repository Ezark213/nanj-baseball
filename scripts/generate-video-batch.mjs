#!/usr/bin/env node

/**
 * 音声+字幕から動画ファイルを一括自動生成
 * MoviePy (Python)を使用した高品質動画合成システム
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  let targetDate = new Date();
  let dateString = 'today';
  let backgroundType = 'baseball'; // デフォルト背景
  
  for (const arg of args) {
    if (arg.startsWith('--date=')) {
      const dateValue = arg.split('=')[1];
      
      if (dateValue === 'today') {
        targetDate = new Date();
        dateString = 'today';
      } else if (dateValue === 'yesterday') {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 1);
        dateString = 'yesterday';
      } else {
        targetDate = new Date(dateValue);
        if (isNaN(targetDate.getTime())) {
          console.error('❌ 無効な日付形式です。YYYY-MM-DD形式で入力してください。');
          process.exit(1);
        }
        dateString = dateValue;
      }
    }
    
    if (arg.startsWith('--background=')) {
      backgroundType = arg.split('=')[1];
    }
  }
  
  return { targetDate, dateString, backgroundType };
}

// 日付フォーマット関数
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Python動画合成スクリプトを作成
function createVideoPythonScript(outputDir) {
  const scriptContent = `#!/usr/bin/env python3
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
`;
  
  const scriptPath = path.join(outputDir, 'video_batch_generator.py');
  fs.writeFileSync(scriptPath, scriptContent);
  return scriptPath;
}

// Pythonスクリプトを実行
function runPythonScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output); // リアルタイム出力
    });
    
    python.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      if (!output.includes('UserWarning')) { // MoviePyの警告を除外
        process.stderr.write(output);
      }
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(\`Python script failed with code \${code}: \${stderr}\`));
      }
    });
    
    python.on('error', (error) => {
      reject(error);
    });
  });
}

// 必要なPython依存関係をチェック
async function checkPythonDependencies() {
  try {
    const python = spawn('python', ['-c', 'import moviepy; import numpy; print("Dependencies OK")']);
    
    return new Promise((resolve) => {
      let output = '';
      
      python.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      python.on('close', (code) => {
        resolve(code === 0 && output.includes('Dependencies OK'));
      });
      
      python.on('error', () => {
        resolve(false);
      });
    });
    
  } catch (error) {
    return false;
  }
}

// メイン処理
async function generateVideoBatch() {
  const { targetDate, dateString, backgroundType } = parseArgs();
  const formattedDate = formatDate(targetDate);
  
  console.log('🎬 音声+字幕から動画一括生成開始！');
  console.log('==========================================');
  console.log(\`📅 対象日付: \${formattedDate} (\${dateString})\`);
  console.log(\`🎨 背景タイプ: \${backgroundType}\`);
  console.log('');
  
  try {
    // Python依存関係チェック
    console.log('🔍 Python依存関係をチェック中...');
    const depsOK = await checkPythonDependencies();
    
    if (!depsOK) {
      console.error('❌ Python依存関係が不足しています');
      console.log('');
      console.log('🔧 必要なパッケージをインストール:');
      console.log('   pip install moviepy numpy');
      console.log('');
      console.log('または:');
      console.log('   pip install -r python/requirements.txt');
      process.exit(1);
    }
    
    console.log('✅ Python依存関係OK');
    console.log('');
    
    // ディレクトリパス設定
    const audioDir = path.join(process.cwd(), 'audio', \`nanj-\${formattedDate}\`);
    const subtitleDir = path.join(process.cwd(), 'subtitles', \`nanj-\${formattedDate}\`);
    const videoDir = path.join(process.cwd(), 'videos', \`nanj-\${formattedDate}\`);
    
    // ディレクトリ存在確認
    if (!fs.existsSync(audioDir)) {
      console.error(\`❌ 音声ディレクトリが見つかりません: \${audioDir}\`);
      console.log('先に音声ファイルを生成してください:');
      console.log(\`   node scripts/generate-daily-audio.mjs --date=\${dateString}\`);
      process.exit(1);
    }
    
    if (!fs.existsSync(subtitleDir)) {
      console.error(\`❌ 字幕ディレクトリが見つかりません: \${subtitleDir}\`);
      console.log('先に字幕ファイルを生成してください:');
      console.log(\`   node scripts/generate-subtitles-batch.mjs --date=\${dateString}\`);
      process.exit(1);
    }
    
    // 出力ディレクトリ作成
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    
    console.log(\`📁 音声ディレクトリ: \${audioDir}\`);
    console.log(\`📁 字幕ディレクトリ: \${subtitleDir}\`);
    console.log(\`📁 動画出力先: \${videoDir}\`);
    console.log('');
    
    // ファイル数確認
    const audioFiles = fs.readdirSync(audioDir).filter(file => file.endsWith('.wav'));
    const subtitleFiles = fs.readdirSync(subtitleDir).filter(file => file.endsWith('.png'));
    
    console.log(\`🎤 音声ファイル: \${audioFiles.length}個\`);
    console.log(\`🎬 字幕ファイル: \${subtitleFiles.length}個\`);
    console.log('');
    
    if (audioFiles.length === 0) {
      console.error('❌ 音声ファイルが見つかりません');
      process.exit(1);
    }
    
    // Python動画生成スクリプトを作成
    console.log('📝 Python動画生成スクリプト作成中...');
    const scriptPath = createVideoPythonScript(videoDir);
    console.log(\`✅ スクリプト作成完了: \${scriptPath}\`);
    console.log('');
    
    // Python動画生成実行
    console.log('🎥 動画生成処理開始...');
    console.log('=========================================');
    
    const startTime = Date.now();
    
    await runPythonScript(scriptPath, [
      audioDir,
      subtitleDir, 
      videoDir,
      backgroundType
    ]);
    
    const totalTime = Date.now() - startTime;
    
    // 結果確認
    const videoFiles = fs.readdirSync(videoDir).filter(file => file.endsWith('.mp4'));
    const successCount = videoFiles.length;
    
    console.log('🎉 動画生成一括処理完了！');
    console.log('=========================================');
    console.log(\`📊 最終結果:\`);
    console.log(\`   対象日付: \${formattedDate} (\${dateString})\`);
    console.log(\`   音声ファイル数: \${audioFiles.length}個\`);
    console.log(\`   生成動画数: \${successCount}個\`);
    console.log(\`   成功率: \${Math.round((successCount/audioFiles.length)*100)}%\`);
    console.log(\`   総処理時間: \${Math.round(totalTime/1000)}秒\`);
    console.log(\`   平均処理時間: \${Math.round(totalTime/audioFiles.length/1000)}秒/動画\`);
    console.log(\`   動画保存先: \${videoDir}\`);
    console.log('');
    
    // 生成された動画ファイル情報
    if (successCount > 0) {
      console.log('📁 生成された動画ファイル（最初の5個）:');
      videoFiles.slice(0, 5).forEach((file, index) => {
        const stats = fs.statSync(path.join(videoDir, file));
        const sizeMB = Math.round(stats.size / (1024 * 1024) * 100) / 100;
        console.log(\`   \${index + 1}. \${file} (\${sizeMB}MB)\`);
      });
      if (videoFiles.length > 5) {
        console.log(\`   ... 他\${videoFiles.length - 5}個のファイル\`);
      }
    }
    
    // 総ファイルサイズ計算
    let totalSizeMB = 0;
    videoFiles.forEach(file => {
      const stats = fs.statSync(path.join(videoDir, file));
      totalSizeMB += stats.size / (1024 * 1024);
    });
    
    console.log('');
    console.log(\`💾 総ファイルサイズ: \${Math.round(totalSizeMB)}MB\`);
    console.log(\`🎯 平均ファイルサイズ: \${Math.round(totalSizeMB/successCount)}MB/動画\`);
    console.log('');
    
    console.log('🚀 完全自動化パイプライン完了！');
    console.log('   音声生成 → 字幕生成 → 動画生成');
    console.log(\`   最終成果物: \${successCount}個の完成動画ファイル\`);
    
    // クリーンアップ
    fs.unlinkSync(scriptPath);
    
  } catch (error) {
    console.error('❌ 動画生成エラー:', error.message);
    console.log('');
    console.log('🔧 対処方法:');
    console.log('  - Python環境の確認: python --version');
    console.log('  - 依存関係の確認: pip install moviepy numpy');
    console.log('  - 十分なディスク容量があるか確認');
    console.log('  - 音声・字幕ファイルが正常に生成されているか確認');
  }
}

// ヘルプ表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🎬 なんJ野球動画一括生成システム');
  console.log('');
  console.log('使用方法:');
  console.log('  node scripts/generate-video-batch.mjs [オプション]');
  console.log('');
  console.log('オプション:');
  console.log('  --date=today         今日の日付で実行 (デフォルト)');
  console.log('  --date=yesterday     昨日の日付で実行');
  console.log('  --date=YYYY-MM-DD    特定の日付で実行');
  console.log('  --background=TYPE    背景タイプ (baseball/night/simple)');
  console.log('  --help, -h           このヘルプを表示');
  console.log('');
  console.log('機能:');
  console.log('  - 音声+字幕から動画ファイルを自動生成');
  console.log('  - MoviePy使用の高品質レンダリング');
  console.log('  - 1920x1080, 30fps, MP4出力');
  console.log('  - 野球場風背景の自動生成');
  console.log('  - バッチ処理対応');
  console.log('');
  console.log('必要な依存関係:');
  console.log('  - Python 3.x');
  console.log('  - pip install moviepy numpy');
  console.log('');
  console.log('例:');
  console.log('  node scripts/generate-video-batch.mjs');
  console.log('  node scripts/generate-video-batch.mjs --date=yesterday');
  console.log('  node scripts/generate-video-batch.mjs --background=night');
  console.log('  node scripts/generate-video-batch.mjs --date=2025-09-10 --background=baseball');
  process.exit(0);
}

generateVideoBatch();