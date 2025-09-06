#!/usr/bin/env node

/**
 * 完全自動化パイプライン - 音声→字幕→動画の一括生成
 * 既存素材(背景/GIF/音楽)を使用した高品質動画生成システム
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  let targetDate = new Date();
  let dateString = 'today';
  let assetsDir = 'assets'; // 素材ディレクトリ
  let useSites = false;
  
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
    
    if (arg.startsWith('--assets=')) {
      assetsDir = arg.split('=')[1];
    }
    
    if (arg === '--sites') {
      useSites = true;
    }
  }
  
  return { targetDate, dateString, assetsDir, useSites };
}

// 日付フォーマット関数
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// スクリプト実行関数
function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 実行: node ${path.basename(scriptPath)} ${args.join(' ')}`);
    
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit', // 出力をリアルタイム表示
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${path.basename(scriptPath)} 完了`);
        resolve();
      } else {
        reject(new Error(`❌ ${path.basename(scriptPath)} 失敗 (exit code: ${code})`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// 素材ディレクトリを初期化
function initializeAssetsDirectory(assetsDir) {
  const assetsPath = path.join(process.cwd(), assetsDir);
  
  // 基本ディレクトリ構成を作成
  const subDirs = [
    'backgrounds',      // 背景画像・動画
    'backgrounds/images',
    'backgrounds/videos',
    'gifs',            // GIFアニメーション
    'gifs/reactions',  // リアクション系
    'gifs/baseball',   // 野球関連
    'music',           // 背景音楽・効果音
    'music/bgm',       // BGM
    'music/sfx',       // 効果音
    'overlays',        // オーバーレイ素材
    'fonts'            // フォント
  ];
  
  subDirs.forEach(subDir => {
    const dirPath = path.join(assetsPath, subDir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // サンプル構成ファイルを作成
  const assetsConfigPath = path.join(assetsPath, 'assets-config.json');
  if (!fs.existsSync(assetsConfigPath)) {
    const sampleConfig = {
      "backgrounds": {
        "baseball_field": "backgrounds/images/baseball_field.jpg",
        "night_game": "backgrounds/images/night_game.jpg", 
        "stadium": "backgrounds/videos/stadium.mp4"
      },
      "gifs": {
        "home_run": "gifs/baseball/home_run.gif",
        "celebration": "gifs/reactions/celebration.gif",
        "disappointed": "gifs/reactions/disappointed.gif",
        "excited": "gifs/reactions/excited.gif"
      },
      "music": {
        "bgm_default": "music/bgm/baseball_theme.mp3",
        "sfx_cheer": "music/sfx/crowd_cheer.mp3",
        "sfx_hit": "music/sfx/bat_hit.mp3"
      },
      "fonts": {
        "main": "fonts/NotoSansJP-Bold.otf",
        "subtitle": "fonts/NotoSansJP-Regular.otf"
      }
    };
    
    fs.writeFileSync(assetsConfigPath, JSON.stringify(sampleConfig, null, 2));
  }
  
  return assetsPath;
}

// 素材の使用状況をチェック
function checkAssets(assetsDir) {
  const assetsPath = path.join(process.cwd(), assetsDir);
  const configPath = path.join(assetsPath, 'assets-config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log(`⚠️  素材設定ファイルが見つかりません: ${configPath}`);
    return { available: false, assets: {} };
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    // 素材ファイルの存在確認
    const availableAssets = {
      backgrounds: [],
      gifs: [],
      music: [],
      fonts: []
    };
    
    Object.keys(config).forEach(category => {
      if (availableAssets[category] !== undefined) {
        Object.entries(config[category]).forEach(([name, filePath]) => {
          const fullPath = path.join(assetsPath, filePath);
          if (fs.existsSync(fullPath)) {
            availableAssets[category].push({ name, path: fullPath, relativePath: filePath });
          }
        });
      }
    });
    
    return { available: true, assets: availableAssets };
    
  } catch (error) {
    console.log(`⚠️  素材設定ファイル読み込みエラー: ${error.message}`);
    return { available: false, assets: {} };
  }
}

// 高品質動画生成用のPythonスクリプト作成
function createAdvancedVideoPythonScript(outputDir, assetsInfo) {
  const scriptContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import random
from pathlib import Path
from moviepy.editor import *
import numpy as np

def load_background_asset(assets_info, duration):
    """背景素材を読み込み"""
    backgrounds = assets_info.get('backgrounds', [])
    
    if not backgrounds:
        # デフォルト背景生成
        return create_default_background(duration)
    
    # ランダムに背景を選択
    bg_asset = random.choice(backgrounds)
    bg_path = bg_asset['path']
    
    if bg_path.endswith(('.mp4', '.mov', '.avi')):
        # 動画背景
        try:
            bg_clip = VideoFileClip(bg_path)
            if bg_clip.duration < duration:
                # ループ再生
                bg_clip = bg_clip.loop(duration=duration)
            else:
                bg_clip = bg_clip.subclip(0, duration)
            return bg_clip.resize((1920, 1080))
        except:
            return create_default_background(duration)
    
    elif bg_path.endswith(('.jpg', '.png', '.jpeg')):
        # 画像背景
        try:
            bg_clip = ImageClip(bg_path, duration=duration)
            return bg_clip.resize((1920, 1080))
        except:
            return create_default_background(duration)
    
    return create_default_background(duration)

def add_gif_overlay(video_clip, assets_info, comment_emotion='neutral'):
    """GIFオーバーレイを追加"""
    gifs = assets_info.get('gifs', [])
    
    if not gifs:
        return video_clip
    
    # 感情に応じたGIF選択（簡易実装）
    suitable_gifs = []
    for gif in gifs:
        gif_name = gif['name'].lower()
        if comment_emotion == 'excited' and any(word in gif_name for word in ['celebration', 'excited', 'home_run']):
            suitable_gifs.append(gif)
        elif comment_emotion == 'sad' and any(word in gif_name for word in ['disappointed', 'sad']):
            suitable_gifs.append(gif)
        else:
            suitable_gifs.append(gif)
    
    if not suitable_gifs:
        suitable_gifs = gifs
    
    try:
        # ランダムGIF選択
        selected_gif = random.choice(suitable_gifs)
        gif_path = selected_gif['path']
        
        # GIF読み込み
        gif_clip = VideoFileClip(gif_path)
        
        # GIFのサイズと位置を調整
        gif_clip = gif_clip.resize(0.3)  # 30%サイズ
        gif_clip = gif_clip.set_position(('right', 'top')).set_duration(video_clip.duration)
        
        # 透明度調整
        gif_clip = gif_clip.set_opacity(0.8)
        
        return CompositeVideoClip([video_clip, gif_clip])
        
    except Exception as e:
        print(f"   GIF処理エラー: {str(e)}")
        return video_clip

def add_background_music(video_clip, assets_info, volume=0.1):
    """背景音楽を追加"""
    music_files = assets_info.get('music', [])
    
    if not music_files:
        return video_clip
    
    try:
        # BGMファイルを選択
        bgm_files = [m for m in music_files if 'bgm' in m['name'].lower()]
        if not bgm_files:
            bgm_files = music_files
        
        if bgm_files:
            selected_music = random.choice(bgm_files)
            music_path = selected_music['path']
            
            # 音楽読み込み
            music_clip = AudioFileClip(music_path)
            
            # 動画の長さに合わせる
            if music_clip.duration < video_clip.duration:
                music_clip = music_clip.loop(duration=video_clip.duration)
            else:
                music_clip = music_clip.subclip(0, video_clip.duration)
            
            # ボリューム調整
            music_clip = music_clip.volumex(volume)
            
            # 既存音声と合成
            if video_clip.audio:
                final_audio = CompositeAudioClip([video_clip.audio, music_clip])
            else:
                final_audio = music_clip
            
            return video_clip.set_audio(final_audio)
        
    except Exception as e:
        print(f"   BGM処理エラー: {str(e)}")
    
    return video_clip

def analyze_comment_emotion(comment):
    """コメント感情分析"""
    excited_keywords = ['やったぜ', 'すげー', '神', '鳥肌', '興奮', 'ガチで', 'やべー']
    sad_keywords = ['辛い', '可哀想', 'やめたれ', 'ダメ', 'クソ', '失敗', '炎上']
    
    if any(word in comment for word in excited_keywords):
        return 'excited'
    elif any(word in comment for word in sad_keywords):
        return 'sad'
    else:
        return 'neutral'

def create_default_background(duration):
    """デフォルト背景生成"""
    def make_frame(t):
        gradient = np.zeros((1080, 1920, 3), dtype=np.uint8)
        
        for i in range(1080):
            if i < 1080 * 0.3:
                ratio = i / (1080 * 0.3)
                gradient[i, :, 0] = int(135 * (1 - ratio) + 144 * ratio)
                gradient[i, :, 1] = int(206 * (1 - ratio) + 238 * ratio)
                gradient[i, :, 2] = int(235 * (1 - ratio) + 144 * ratio)
            else:
                ratio = (i - 1080 * 0.3) / (1080 * 0.7)
                gradient[i, :, 0] = int(144 * (1 - ratio) + 34 * ratio)
                gradient[i, :, 1] = int(238 * (1 - ratio) + 139 * ratio)
                gradient[i, :, 2] = int(144 * (1 - ratio) + 34 * ratio)
        
        return gradient
    
    return VideoClip(make_frame, duration=duration)

def create_enhanced_video(audio_path, subtitle_path, output_path, assets_info, comment=""):
    """高品質動画作成（素材使用版）"""
    try:
        # 音声ファイル読み込み
        audio = AudioFileClip(audio_path)
        duration = audio.duration
        
        print(f"   音声: {os.path.basename(audio_path)} ({duration:.2f}秒)")
        
        # 感情分析
        emotion = analyze_comment_emotion(comment)
        print(f"   感情分析: {emotion}")
        
        # 背景素材読み込み
        background = load_background_asset(assets_info, duration)
        
        # 字幕読み込み・配置
        if os.path.exists(subtitle_path):
            subtitle_img = ImageClip(subtitle_path, duration=duration)
            
            # 字幕を画面下部中央に配置
            subtitle_img = subtitle_img.set_position(('center', 0.8), relative=True)
            
            # 字幕サイズ調整
            img_width, img_height = subtitle_img.size
            if img_width > 1920 * 0.8:
                scale_factor = (1920 * 0.8) / img_width
                subtitle_img = subtitle_img.resize(scale_factor)
            
            print(f"   字幕: {os.path.basename(subtitle_path)}")
            
            # 背景と字幕を合成
            video = CompositeVideoClip([background, subtitle_img])
        else:
            print(f"   ⚠️ 字幕ファイルが見つかりません")
            video = background
        
        # GIFオーバーレイ追加
        video = add_gif_overlay(video, assets_info, emotion)
        
        # 音声追加
        video = video.set_audio(audio)
        
        # 背景音楽追加
        video = add_background_music(video, assets_info)
        
        # 動画出力
        video.write_videofile(
            output_path,
            fps=30,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile=f'temp-audio-{random.randint(1000,9999)}.m4a',
            remove_temp=True,
            verbose=False,
            logger=None,
            preset='medium'
        )
        
        # クリーンアップ
        video.close()
        audio.close()
        
        return True
        
    except Exception as e:
        print(f"   ❌ 高品質動画生成エラー: {str(e)}")
        return False

def main():
    if len(sys.argv) < 5:
        print("使用方法: python enhanced_video_generator.py <audio_dir> <subtitle_dir> <output_dir> <assets_info_json>")
        sys.exit(1)
    
    audio_dir = sys.argv[1]
    subtitle_dir = sys.argv[2]
    output_dir = sys.argv[3]
    assets_info = json.loads(sys.argv[4])
    
    # 出力ディレクトリ作成
    os.makedirs(output_dir, exist_ok=True)
    
    # コメントファイル読み込み（簡易実装）
    comments = [
        'あーもう9回2死でダメかと思ったわ、やりやがった', '代打のタイムリーで同点とかさすがやな',
        '決勝打、これは鳥肌もんやで', '長丁場の試合、最後まで見ててよかったわ',
        # ... 他のコメント
    ] * 20  # 60個まで拡張
    
    # 音声ファイル一覧
    audio_files = [f for f in os.listdir(audio_dir) if f.endswith('.wav')]
    audio_files.sort()
    
    print(f"🎬 高品質動画生成開始: {len(audio_files)}個のファイル")
    print(f"素材情報: {len(assets_info.get('backgrounds', []))}個の背景, {len(assets_info.get('gifs', []))}個のGIF")
    print()
    
    success_count = 0
    
    for i, audio_file in enumerate(audio_files):
        audio_path = os.path.join(audio_dir, audio_file)
        subtitle_file = audio_file.replace('.wav', '_subtitle.png')
        subtitle_path = os.path.join(subtitle_dir, subtitle_file)
        video_file = audio_file.replace('.wav', '_enhanced.mp4')
        video_path = os.path.join(output_dir, video_file)
        
        comment = comments[i] if i < len(comments) else ""
        
        print(f"🎥 {i+1}/{len(audio_files)}: {video_file}")
        
        if create_enhanced_video(audio_path, subtitle_path, video_path, assets_info, comment):
            file_size = os.path.getsize(video_path) / (1024 * 1024)
            print(f"   ✅ 高品質動画生成完了: {file_size:.2f}MB")
            success_count += 1
        
        print()
    
    print(f"🎉 高品質動画生成完了: {success_count}/{len(audio_files)}個成功")

if __name__ == "__main__":
    main()
`;
  
  const scriptPath = path.join(outputDir, 'enhanced_video_generator.py');
  fs.writeFileSync(scriptPath, scriptContent);
  return scriptPath;
}

// メイン処理
async function generateFullPipeline() {
  const { targetDate, dateString, assetsDir, useSites } = parseArgs();
  const formattedDate = formatDate(targetDate);
  
  console.log('🎬 なんJ野球完全自動化パイプライン開始！');
  console.log('==============================================');
  console.log(`📅 対象日付: ${formattedDate} (${dateString})`);
  console.log(`🎨 素材ディレクトリ: ${assetsDir}`);
  console.log(`🌐 指定3サイト使用: ${useSites ? 'Yes' : 'No'}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // 素材ディレクトリ初期化
    console.log('📁 素材ディレクトリを初期化...');
    const assetsPath = initializeAssetsDirectory(assetsDir);
    console.log(`✅ 素材ディレクトリ初期化完了: ${assetsPath}`);
    console.log('');
    
    // 素材チェック
    console.log('🔍 利用可能な素材をチェック...');
    const assetsInfo = checkAssets(assetsDir);
    
    if (assetsInfo.available) {
      console.log('✅ 素材設定ファイル読み込み完了');
      console.log(`   背景素材: ${assetsInfo.assets.backgrounds.length}個`);
      console.log(`   GIF素材: ${assetsInfo.assets.gifs.length}個`);
      console.log(`   音楽素材: ${assetsInfo.assets.music.length}個`);
      console.log(`   フォント: ${assetsInfo.assets.fonts.length}個`);
    } else {
      console.log('⚠️  素材ファイルが見つかりませんが、デフォルト設定で続行します');
    }
    console.log('');
    
    // ステップ1: 3サイト情報取得（オプション）
    if (useSites) {
      console.log('🔍 【ステップ1】指定3サイト情報取得開始...');
      console.log('============================================');
      
      await runScript(
        path.join(process.cwd(), 'scripts', 'fetch-nanj-sites.mjs'),
        [`--date=${dateString}`, '--sites']
      );
      
      console.log('✅ 指定3サイト情報取得完了');
      console.log('');
    }
    
    // ステップ2: 音声生成
    console.log('🎤 【ステップ2】音声ファイル生成開始...');
    console.log('========================================');
    
    const audioArgs = [`--date=${dateString}`];
    if (useSites) {
      audioArgs.push('--sites');
    }
    
    await runScript(
      path.join(process.cwd(), 'scripts', 'generate-daily-audio.mjs'),
      audioArgs
    );
    
    console.log('✅ 音声ファイル生成完了 (1.5倍速, 60個)');
    console.log('');
    
    // ステップ3: 字幕生成
    console.log('🎬 【ステップ3】字幕画像生成開始...');
    console.log('=====================================');
    
    await runScript(
      path.join(process.cwd(), 'scripts', 'generate-subtitles-batch.mjs'),
      [`--date=${dateString}`]
    );
    
    console.log('✅ 字幕画像生成完了 (感情分析対応)');
    console.log('');
    
    // ステップ4: 高品質動画生成
    console.log('🎥 【ステップ4】高品質動画生成開始...');
    console.log('=====================================');
    
    if (assetsInfo.available && 
        (assetsInfo.assets.backgrounds.length > 0 || 
         assetsInfo.assets.gifs.length > 0 || 
         assetsInfo.assets.music.length > 0)) {
      
      // 素材を使った高品質動画生成
      console.log('🌟 素材使用の高品質動画生成モード');
      
      const videoDir = path.join(process.cwd(), 'videos', `nanj-${formattedDate}`);
      if (!fs.existsSync(videoDir)) {
        fs.mkdirSync(videoDir, { recursive: true });
      }
      
      const scriptPath = createAdvancedVideoPythonScript(videoDir, assetsInfo.assets);
      
      // Python実行
      const audioDir = path.join(process.cwd(), 'audio', `nanj-${formattedDate}`);
      const subtitleDir = path.join(process.cwd(), 'subtitles', `nanj-${formattedDate}`);
      
      await new Promise((resolve, reject) => {
        const python = spawn('python', [
          scriptPath,
          audioDir,
          subtitleDir,
          videoDir,
          JSON.stringify(assetsInfo.assets)
        ], { stdio: 'inherit' });
        
        python.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Python script failed with code ${code}`));
        });
        
        python.on('error', reject);
      });
      
      fs.unlinkSync(scriptPath); // クリーンアップ
      
    } else {
      // 標準動画生成
      console.log('📹 標準動画生成モード');
      
      await runScript(
        path.join(process.cwd(), 'scripts', 'generate-video-batch.mjs'),
        [`--date=${dateString}`, '--background=baseball']
      );
    }
    
    console.log('✅ 動画生成完了');
    console.log('');
    
    // 完了報告
    const totalTime = Date.now() - startTime;
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);
    
    console.log('🎉 完全自動化パイプライン完了！');
    console.log('=====================================');
    console.log(`📊 処理結果:`);
    console.log(`   対象日付: ${formattedDate} (${dateString})`);
    console.log(`   総処理時間: ${minutes}分${seconds}秒`);
    console.log('');
    console.log('📁 生成されたファイル:');
    
    // ファイル数確認
    const audioDir = path.join(process.cwd(), 'audio', `nanj-${formattedDate}`);
    const subtitleDir = path.join(process.cwd(), 'subtitles', `nanj-${formattedDate}`);
    const videoDir = path.join(process.cwd(), 'videos', `nanj-${formattedDate}`);
    
    if (fs.existsSync(audioDir)) {
      const audioFiles = fs.readdirSync(audioDir).filter(f => f.endsWith('.wav'));
      console.log(`   🎤 音声ファイル: ${audioFiles.length}個 (${audioDir})`);
    }
    
    if (fs.existsSync(subtitleDir)) {
      const subtitleFiles = fs.readdirSync(subtitleDir).filter(f => f.endsWith('.png'));
      console.log(`   🎬 字幕ファイル: ${subtitleFiles.length}個 (${subtitleDir})`);
    }
    
    if (fs.existsSync(videoDir)) {
      const videoFiles = fs.readdirSync(videoDir).filter(f => f.endsWith('.mp4'));
      let totalSizeMB = 0;
      videoFiles.forEach(file => {
        const stats = fs.statSync(path.join(videoDir, file));
        totalSizeMB += stats.size / (1024 * 1024);
      });
      
      console.log(`   🎥 動画ファイル: ${videoFiles.length}個 (${Math.round(totalSizeMB)}MB) (${videoDir})`);
    }
    
    console.log('');
    console.log('🚀 使用可能な動画ファイルが生成されました！');
    console.log('   YouTube、SNS投稿、ライブ配信などにご利用ください。');
    
  } catch (error) {
    console.error(`❌ パイプライン実行エラー: ${error.message}`);
    console.log('');
    console.log('🔧 対処方法:');
    console.log('  - 各ステップを個別実行して問題を特定');
    console.log('  - VoiceVoxアプリケーションの起動確認');
    console.log('  - Python依存関係の確認: pip install moviepy numpy');
    console.log('  - 十分なディスク容量があるか確認');
  }
}

// ヘルプ表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🎬 なんJ野球完全自動化パイプライン');
  console.log('');
  console.log('使用方法:');
  console.log('  node scripts/generate-full-pipeline.mjs [オプション]');
  console.log('');
  console.log('オプション:');
  console.log('  --date=today         今日の日付で実行 (デフォルト)');
  console.log('  --date=yesterday     昨日の日付で実行');
  console.log('  --date=YYYY-MM-DD    特定の日付で実行');
  console.log('  --assets=DIR         素材ディレクトリを指定');
  console.log('  --sites              指定3サイトの情報を使用');
  console.log('  --help, -h           このヘルプを表示');
  console.log('');
  console.log('パイプライン:');
  console.log('  1. 指定3サイト情報取得 (オプション)');
  console.log('  2. 音声ファイル生成 (VoiceVox, 1.5倍速)');
  console.log('  3. 字幕画像生成 (感情分析対応)');
  console.log('  4. 高品質動画生成 (素材使用)');
  console.log('');
  console.log('素材ディレクトリ構成:');
  console.log('  assets/');
  console.log('  ├── backgrounds/     # 背景画像・動画');
  console.log('  ├── gifs/           # GIFアニメーション');
  console.log('  ├── music/          # BGM・効果音');
  console.log('  └── fonts/          # フォント');
  console.log('');
  console.log('例:');
  console.log('  node scripts/generate-full-pipeline.mjs');
  console.log('  node scripts/generate-full-pipeline.mjs --sites --date=yesterday');
  console.log('  node scripts/generate-full-pipeline.mjs --assets=my_assets --date=2025-09-10');
  process.exit(0);
}

generateFullPipeline();