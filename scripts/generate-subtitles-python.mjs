#!/usr/bin/env node

/**
 * Python PIL を使った字幕生成スクリプト（Canvas代替）
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
  
  args.forEach(arg => {
    if (arg.startsWith('--date=')) {
      dateString = arg.split('=')[1];
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
  
  return { targetDate, dateString };
}

// 音声ファイルからテキストを抽出
function extractTextFromFilename(filename) {
  // ファイル名から音声IDを抽出して、対応するコメントテキストを取得
  const commentTexts = {
    'theme1_comment1': 'あーもう9回2死でダメかと思ったわ、やりやがった',
    'theme1_comment2': '代打のタイムリーで同点とかさすがやな',
    'theme1_comment3': '決勝打、これは鳥肌もんやで',
    'theme1_comment4': '長丁場の試合、最後まで見ててよかったわ',
    'theme1_comment5': '球場が静まり返った瞬間やったな',
    'theme1_comment6': 'ソロHRから流れ変わった気がするわ',
    'theme1_comment7': '連続タイムリーで希望見えてきたんよな',
    'theme1_comment8': '5連打はえぐすぎるやろ、相手ファン可哀想',
    'theme1_comment9': 'あの投手の勝利とか予想できんかったわ',
    'theme1_comment10': 'クローザーの安定感、やっぱすげーわ',
    'theme1_comment11': '0-4からの逆転とかドラマすぎやろ',
    'theme1_comment12': '連続HRから始まった悪夢やったな',
    'theme1_comment13': '先発2回4失点でKOは草、どうにかせえや',
    'theme1_comment14': 'ベンチの監督も最後は立ち上がっとったな',
    'theme1_comment15': '5回以降完全に沈黙してもうたやん',
    'theme1_comment16': 'あの選手まじでやばいな、成長してくれや',
    'theme1_comment17': '代打で出てきた時の存在感よ、さすがやで',
    'theme1_comment18': '9回裏の攻撃、手に汗握りすぎて疲れたわ',
    'theme1_comment19': 'ホームの観客、途中で帰った人多そう',
    'theme1_comment20': '先制されるといつも負けるイメージやったのに今回は違った',
    
    'theme2_comment1': '今季初の失敗とか、めっちゃレアやん',
    'theme2_comment2': 'エースが崩壊とか見てて辛いわ',
    'theme2_comment3': 'あの投手が連打浴びるとか信じられんで',
    'theme2_comment4': 'ストレートが走ってなかった気がするな',
    'theme2_comment5': 'タイトル争いしてたのにここで失敗は痛いわ',
    'theme2_comment6': 'ファン、あの選手に当たりそうで心配やな',
    'theme2_comment7': '9回2死で登場の時点で嫌な予感してた',
    'theme2_comment8': '表情、マウンドで呆然としてたやん',
    'theme2_comment9': 'この1敗で順位争いに影響出そうやな',
    'theme2_comment10': 'あのレベルでも打たれる時は打たれるんやな',
    'theme2_comment11': '代打との対戦、最初から分が悪そうやった',
    'theme2_comment12': '制球が微妙にアバウトになっとったな',
    'theme2_comment13': '勝ちパターンが崩れた瞬間やったわ',
    'theme2_comment14': '普段はもっとキレがあるのになあ',
    'theme2_comment15': '失敗の瞬間、ベンチも凍りついとった',
    'theme2_comment16': '一流でもこんな日があるんやなって',
    'theme2_comment17': '投球フォーム、いつもより固く見えた',
    'theme2_comment18': '9回の失点、完全に想定外の展開やったな',
    'theme2_comment19': 'あの場面で打たれるのもプロの厳しさやで',
    'theme2_comment20': '次の登板でリベンジしてくれや',
    
    'theme3_comment1': '9回2死からの連打、野球は最後まで分からんな',
    'theme3_comment2': 'あの場面で諦めんかった打線、根性あるわ',
    'theme3_comment3': '満塁で代打が出てきた時の期待感よ',
    'theme3_comment4': 'ここぞという時に打つバッティングやなあ',
    'theme3_comment5': '代打策がハマりまくった監督の采配や',
    'theme3_comment6': '2死から始まった奇跡、鳥肌立ったで',
    'theme3_comment7': 'ホームの観客、大興奮やったろうな',
    'theme3_comment8': '9回裏の攻撃時間だけで30分くらいかかったやろ',
    'theme3_comment9': 'タイムリー、流れを引き寄せたんかな',
    'theme3_comment10': 'ランナー貯まってからの連打、プレッシャーえぐそう',
    'theme3_comment11': '守備陣、最後はミスも出始めてたな',
    'theme3_comment12': '9回の攻撃、一球一球が重すぎたわ',
    'theme3_comment13': 'あの逆転劇、今年のベストゲームに入るやろ',
    'theme3_comment14': 'バッティング、年齢感じさせんかったな',
    'theme3_comment15': '決めた瞬間のベンチの盛り上がりよ',
    'theme3_comment16': 'あと1つアウト取られてたら終わってたもんな',
    'theme3_comment17': '9回2死の絶望感から一転、野球って面白いわ',
    'theme3_comment18': 'リードが一瞬で消えた、恐ろしい攻撃や',
    'theme3_comment19': 'テレビ消そうと思った瞬間の逆転劇やったな',
    'theme3_comment20': 'ファン、今夜は眠れんやろこれ'
  };
  
  // ファイル名から対応するキーを抽出
  for (const key in commentTexts) {
    if (filename.includes(key)) {
      return commentTexts[key];
    }
  }
  
  return 'なんJコメント'; // デフォルトテキスト
}

// Python 字幕生成スクリプトを作成
function createSubtitlePythonScript(outputDir) {
  const scriptContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
from PIL import Image, ImageDraw, ImageFont
import textwrap

def create_subtitle_image(text, output_path, width=1920, height=200):
    """字幕画像を生成"""
    try:
        # 背景色（半透明黒）
        bg_color = (0, 0, 0, 180)  # RGBA
        text_color = (255, 255, 255, 255)  # 白文字
        
        # 画像作成
        img = Image.new('RGBA', (width, height), bg_color)
        draw = ImageDraw.Draw(img)
        
        # フォント設定（システムフォントを使用）
        try:
            # Windows用日本語フォント
            font = ImageFont.truetype("meiryo.ttc", 48)
        except:
            try:
                font = ImageFont.truetype("arial.ttf", 48)
            except:
                # デフォルトフォント
                font = ImageFont.load_default()
        
        # テキストの自動改行
        wrapped_text = textwrap.fill(text, width=25)
        
        # テキスト描画位置計算
        bbox = draw.textbbox((0, 0), wrapped_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (width - text_width) // 2
        y = (height - text_height) // 2
        
        # 字幕テキスト描画
        draw.text((x, y), wrapped_text, font=font, fill=text_color, 
                 anchor="mm", align="center")
        
        # PNG形式で保存
        img.save(output_path, 'PNG')
        print(f"   字幕画像生成: {os.path.basename(output_path)}")
        return True
        
    except Exception as e:
        print(f"   エラー: {str(e)}")
        return False

def main():
    if len(sys.argv) != 3:
        print("使用方法: python subtitle_script.py <text> <output_file>")
        sys.exit(1)
    
    text = sys.argv[1]
    output_file = sys.argv[2]
    
    print(f"字幕生成: {text}")
    
    if create_subtitle_image(text, output_file):
        file_size = os.path.getsize(output_file) / 1024
        print(f"字幕完成: {file_size:.1f}KB")
        return True
    else:
        print("字幕生成失敗")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
`;
  
  const scriptPath = path.join(outputDir, 'subtitle_script.py');
  fs.writeFileSync(scriptPath, scriptContent);
  return scriptPath;
}

// メイン処理
async function generateSubtitles() {
  const { targetDate, dateString } = parseArgs();
  const formattedDate = formatDate(targetDate);
  
  console.log('🎬 Python字幕生成開始！');
  console.log('========================');
  console.log(`📅 対象日付: ${formattedDate} (${dateString})`);
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
    const subtitleDir = path.join(process.cwd(), 'subtitles', `nanj-${formattedDate}`);
    if (!fs.existsSync(subtitleDir)) {
      fs.mkdirSync(subtitleDir, { recursive: true });
    }
    
    // 音声ファイル一覧取得
    const audioFiles = fs.readdirSync(audioDir)
      .filter(file => file.endsWith('.wav'))
      .sort();
    
    console.log(`📁 音声ディレクトリ: ${audioDir}`);
    console.log(`📁 字幕出力先: ${subtitleDir}`);
    console.log(`🎤 音声ファイル: ${audioFiles.length}個`);
    console.log('');
    
    if (audioFiles.length === 0) {
      console.error('❌ 音声ファイルが見つかりません');
      process.exit(1);
    }
    
    // Python字幕生成スクリプト作成
    console.log('📝 Python字幕生成スクリプト作成中...');
    const scriptPath = createSubtitlePythonScript(subtitleDir);
    console.log(`✅ スクリプト作成完了: ${scriptPath}`);
    console.log('');
    
    console.log('🎬 字幕画像生成開始...');
    console.log('');
    
    let successCount = 0;
    const startTime = Date.now();
    
    // 各音声ファイルに対応する字幕を生成
    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      const text = extractTextFromFilename(audioFile);
      const subtitleFile = audioFile.replace('.wav', '_subtitle.png');
      const subtitlePath = path.join(subtitleDir, subtitleFile);
      
      console.log(`🎬 ${i+1}/${audioFiles.length}: ${subtitleFile}`);
      console.log(`   テキスト: "${text}"`);
      
      try {
        // Python字幕生成実行
        await new Promise((resolve, reject) => {
          const python = spawn('python', [scriptPath, text, subtitlePath], {
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
        
        if (fs.existsSync(subtitlePath)) {
          const fileSize = fs.statSync(subtitlePath).size / 1024;
          console.log(`   ✅ 生成完了: ${fileSize.toFixed(1)}KB`);
          successCount++;
        }
        
      } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
      }
      
      console.log('');
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log('🎉 字幕生成完了！');
    console.log('==================');
    console.log(`📊 結果:`);
    console.log(`   対象日付: ${formattedDate} (${dateString})`);
    console.log(`   音声ファイル数: ${audioFiles.length}個`);
    console.log(`   字幕画像数: ${successCount}個`);
    console.log(`   成功率: ${Math.round((successCount/audioFiles.length)*100)}%`);
    console.log(`   処理時間: ${Math.round(totalTime/1000)}秒`);
    console.log(`   保存先: ${subtitleDir}`);
    
    if (successCount > 0) {
      console.log('');
      console.log('✅ Python PIL による字幕生成が完了しました！');
      console.log('🎯 次は字幕付き長編動画を生成できます。');
    }
    
    // クリーンアップ
    fs.unlinkSync(scriptPath);
    
  } catch (error) {
    console.error('❌ 字幕生成エラー:', error.message);
  }
}

generateSubtitles();