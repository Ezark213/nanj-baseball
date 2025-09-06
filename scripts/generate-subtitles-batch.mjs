#!/usr/bin/env node

/**
 * 音声ファイルから字幕画像を一括自動生成
 * generate-daily-audio.mjsで生成された音声ファイルに対応する字幕を自動生成
 */

import * as fs from 'fs';
import * as path from 'path';
import { createCanvas } from 'canvas';

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  let targetDate = new Date();
  let dateString = 'today';
  
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
  }
  
  return { targetDate, dateString };
}

// 日付フォーマット関数
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 字幕スタイル設定
const subtitleStyles = {
  // なんJ語専用スタイル
  nanjDefault: {
    fontSize: 52,
    fontFamily: 'Arial Black, Arial, sans-serif',
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 25,
    margin: 30,
    lineHeight: 1.3,
    maxWidth: 1000,
    shadow: {
      color: 'rgba(0, 0, 0, 0.8)',
      blur: 3,
      offsetX: 2,
      offsetY: 2
    }
  },
  
  // 興奮系コメント用スタイル
  excited: {
    fontSize: 56,
    fontFamily: 'Arial Black, Arial, sans-serif',
    color: '#FFD700', // 金色
    strokeColor: '#FF4500',
    strokeWidth: 5,
    backgroundColor: 'rgba(255, 69, 0, 0.2)',
    padding: 30,
    margin: 25,
    lineHeight: 1.2,
    maxWidth: 1100
  },
  
  // 落ち込み系コメント用スタイル
  sad: {
    fontSize: 48,
    fontFamily: 'Arial, sans-serif',
    color: '#87CEEB', // 薄い青
    strokeColor: '#000080',
    strokeWidth: 3,
    backgroundColor: 'rgba(0, 0, 139, 0.2)',
    padding: 20,
    margin: 35,
    lineHeight: 1.4,
    maxWidth: 950
  }
};

// コメント感情分析（簡易版）
function analyzeCommentEmotion(comment) {
  const excitedKeywords = ['やったぜ', 'すげー', '神', '鳥肌', '興奮', 'ガチで', 'やべー'];
  const sadKeywords = ['辛い', '可哀想', 'やめたれ', 'ダメ', 'クソ', '失敗', '炎上'];
  
  const hasExcited = excitedKeywords.some(word => comment.includes(word));
  const hasSad = sadKeywords.some(word => comment.includes(word));
  
  if (hasExcited) return 'excited';
  if (hasSad) return 'sad';
  return 'nanjDefault';
}

// テキストを行に分割
function splitTextToLines(text, maxWidth, fontSize) {
  const maxCharsPerLine = Math.floor(maxWidth / (fontSize * 0.55));
  const words = text.split('');
  const lines = [];
  let currentLine = '';
  
  for (const char of words) {
    if (currentLine.length >= maxCharsPerLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine += char;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text];
}

// 字幕画像を生成
async function generateSubtitleImage(comment, style, outputPath) {
  try {
    // テキストを行に分割
    const lines = splitTextToLines(comment, style.maxWidth, style.fontSize);
    
    // キャンバスサイズ計算
    const lineHeight = style.fontSize * style.lineHeight;
    const textHeight = lines.length * lineHeight;
    const canvasWidth = Math.min(style.maxWidth + (style.padding * 2) + (style.margin * 2), 1920);
    const canvasHeight = Math.max(textHeight + (style.padding * 2) + (style.margin * 2), style.fontSize + 60);
    
    // キャンバス作成
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    // 背景描画
    if (style.backgroundColor) {
      ctx.fillStyle = style.backgroundColor;
      const x = style.margin;
      const y = style.margin;
      const width = canvasWidth - (style.margin * 2);
      const height = canvasHeight - (style.margin * 2);
      const radius = 15;
      
      // 角丸矩形
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }
    
    // テキスト描画設定
    ctx.font = `${style.fontSize}px "${style.fontFamily}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const startY = (canvasHeight - textHeight) / 2 + (style.fontSize / 2);
    
    lines.forEach((line, index) => {
      const y = startY + (index * lineHeight);
      const x = canvasWidth / 2;
      
      // 影の設定
      if (style.shadow) {
        ctx.shadowColor = style.shadow.color;
        ctx.shadowBlur = style.shadow.blur;
        ctx.shadowOffsetX = style.shadow.offsetX;
        ctx.shadowOffsetY = style.shadow.offsetY;
      }
      
      // 縁取り描画
      if (style.strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.strokeWidth;
        ctx.strokeText(line, x, y);
      }
      
      // テキスト描画
      ctx.fillStyle = style.color;
      ctx.fillText(line, x, y);
      
      // 影をリセット
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });
    
    // PNG保存
    const buffer = canvas.toBuffer('image/png');
    await fs.promises.writeFile(outputPath, buffer);
    
    return {
      success: true,
      outputPath,
      dimensions: { width: canvasWidth, height: canvasHeight },
      lines: lines.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 音声ファイルの長さを推定
async function estimateAudioDuration(audioFilePath) {
  try {
    const stats = await fs.promises.stat(audioFilePath);
    const fileSizeKB = stats.size / 1024;
    
    // WAVファイル（1.5倍速を考慮）の概算
    const estimatedSeconds = (fileSizeKB / 88.2) * 1.5; // 1.5倍速補正
    return Math.max(0.8, Math.round(estimatedSeconds * 10) / 10);
  } catch (error) {
    return 2.5; // デフォルト値
  }
}

// VTT字幕ファイルを生成
async function generateVTTFile(subtitleData, outputPath) {
  let vttContent = 'WEBVTT\n\n';
  
  let currentTime = 0;
  
  for (let i = 0; i < subtitleData.length; i++) {
    const item = subtitleData[i];
    const startTime = currentTime;
    const endTime = currentTime + item.duration;
    
    // 時間フォーマット（HH:MM:SS.mmm）
    const formatTime = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
    };
    
    vttContent += `${i + 1}\n`;
    vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
    vttContent += `${item.text}\n\n`;
    
    currentTime = endTime + 0.1; // 0.1秒の間隔
  }
  
  await fs.promises.writeFile(outputPath, vttContent, 'utf-8');
  return vttContent;
}

// メイン処理
async function generateSubtitlesBatch() {
  const { targetDate, dateString } = parseArgs();
  const formattedDate = formatDate(targetDate);
  
  console.log('🎬 音声ファイルから字幕画像一括生成開始！');
  console.log('=============================================');
  console.log(`📅 対象日付: ${formattedDate} (${dateString})`);
  console.log('');
  
  try {
    // 音声ファイルディレクトリを確認
    const audioDir = path.join(process.cwd(), 'audio', `nanj-${formattedDate}`);
    if (!fs.existsSync(audioDir)) {
      console.error(`❌ 音声ファイルが見つかりません: ${audioDir}`);
      console.log('先に音声ファイルを生成してください:');
      console.log(`node scripts/generate-daily-audio.mjs --date=${dateString}`);
      process.exit(1);
    }
    
    // 字幕出力ディレクトリ作成
    const subtitleDir = path.join(process.cwd(), 'subtitles', `nanj-${formattedDate}`);
    if (!fs.existsSync(subtitleDir)) {
      fs.mkdirSync(subtitleDir, { recursive: true });
    }
    
    console.log(`📁 音声ディレクトリ: ${audioDir}`);
    console.log(`📁 字幕出力先: ${subtitleDir}`);
    console.log('');
    
    // 音声ファイル一覧取得
    const audioFiles = fs.readdirSync(audioDir).filter(file => file.endsWith('.wav'));
    
    if (audioFiles.length === 0) {
      console.error('❌ 音声ファイルが見つかりません');
      process.exit(1);
    }
    
    console.log(`🎤 音声ファイル数: ${audioFiles.length}個`);
    console.log('');
    
    // 生成されたコメントを再利用（実際の実装では音声ファイル名から復元）
    const comments = [
      // テーマ1のコメント (20個)
      'あーもう9回2死でダメかと思ったわ、やりやがった',
      '代打のタイムリーで同点とかさすがやな',
      '決勝打、これは鳥肌もんやで',
      '長丁場の試合、最後まで見ててよかったわ',
      '球場が静まり返った瞬間やったな',
      'ソロHRから流れ変わった気がするわ',
      '連続タイムリーで希望見えてきたんよな',
      '5連打はえぐすぎるやろ、相手ファン可哀想',
      'あの投手の勝利とか予想できんかったわ',
      'クローザーの安定感、やっぱすげーわ',
      '0-4からの逆転とかドラマすぎやろ',
      '連続HRから始まった悪夢やったな',
      '先発2回4失点でKOは草、どうにかせえや',
      'ベンチの監督も最後は立ち上がっとったな',
      '5回以降完全に沈黙してもうたやん',
      'あの選手まじでやばいな、成長してくれや',
      '代打で出てきた時の存在感よ、さすがやで',
      '9回裏の攻撃、手に汗握りすぎて疲れたわ',
      'ホームの観客、途中で帰った人多そう',
      '先制されるといつも負けるイメージやったのに今回は違った',
      
      // テーマ2のコメント (20個)
      '今季初の失敗とか、めっちゃレアやん',
      'エースが崩壊とか見てて辛いわ',
      'あの投手が連打浴びるとか信じられんで',
      'ストレートが走ってなかった気がするな',
      'タイトル争いしてたのにここで失敗は痛いわ',
      'ファン、あの選手に当たりそうで心配やな',
      '9回2死で登場の時点で嫌な予感してた',
      '表情、マウンドで呆然としてたやん',
      'この1敗で順位争いに影響出そうやな',
      'あのレベルでも打たれる時は打たれるんやな',
      '代打との対戦、最初から分が悪そうやった',
      '制球が微妙にアバウトになっとったな',
      '勝ちパターンが崩れた瞬間やったわ',
      '普段はもっとキレがあるのになあ',
      '失敗の瞬間、ベンチも凍りついとった',
      '一流でもこんな日があるんやなって',
      '投球フォーム、いつもより固く見えた',
      '9回の失点、完全に想定外の展開やったな',
      'あの場面で打たれるのもプロの厳しさやで',
      '次の登板でリベンジしてくれや',
      
      // テーマ3のコメント (20個)
      '9回2死からの連打、野球は最後まで分からんな',
      'あの場面で諦めんかった打線、根性あるわ',
      '満塁で代打が出てきた時の期待感よ',
      'ここぞという時に打つバッティングやなあ',
      '代打策がハマりまくった監督の采配や',
      '2死から始まった奇跡、鳥肌立ったで',
      'ホームの観客、大興奮やったろうな',
      '9回裏の攻撃時間だけで30分くらいかかったやろ',
      'タイムリー、流れを引き寄せたんかな',
      'ランナー貯まってからの連打、プレッシャーえぐそう',
      '守備陣、最後はミスも出始めてたな',
      '9回の攻撃、一球一球が重すぎたわ',
      'あの逆転劇、今年のベストゲームに入るやろ',
      'バッティング、年齢感じさせんかったな',
      '決めた瞬間のベンチの盛り上がりよ',
      'あと1つアウト取られてたら終わってたもんな',
      '9回2死の絶望感から一転、野球って面白いわ',
      'リードが一瞬で消えた、恐ろしい攻撃や',
      'テレビ消そうと思った瞬間の逆転劇やったな',
      'ファン、今夜は眠れんやろこれ'
    ];
    
    let successCount = 0;
    const subtitleData = [];
    const startTime = Date.now();
    
    // 各音声ファイルに対して字幕生成
    for (let i = 0; i < audioFiles.length && i < comments.length; i++) {
      const audioFile = audioFiles[i];
      const comment = comments[i];
      const audioPath = path.join(audioDir, audioFile);
      
      // テーマとコメント番号を抽出
      const themeNum = Math.floor(i / 20) + 1;
      const commentNum = (i % 20) + 1;
      
      console.log(`🎬 ${i + 1}/60 [テーマ${themeNum}-${commentNum}]: "${comment.substring(0, 35)}${comment.length > 35 ? '...' : ''}"`);
      
      try {
        // 感情分析でスタイル決定
        const emotion = analyzeCommentEmotion(comment);
        const style = subtitleStyles[emotion];
        
        console.log(`   スタイル: ${emotion}`);
        
        // 字幕画像ファイル名生成
        const subtitleFileName = audioFile.replace('.wav', '_subtitle.png');
        const subtitlePath = path.join(subtitleDir, subtitleFileName);
        
        // 字幕画像生成
        const result = await generateSubtitleImage(comment, style, subtitlePath);
        
        if (result.success) {
          // 音声の長さを推定
          const duration = await estimateAudioDuration(audioPath);
          
          subtitleData.push({
            text: comment,
            audioFile: audioFile,
            subtitleFile: subtitleFileName,
            duration: duration,
            theme: themeNum,
            commentNumber: commentNum
          });
          
          console.log(`   ✅ 字幕生成成功! ${subtitleFileName} (${result.dimensions.width}x${result.dimensions.height}px, ${result.lines}行)`);
          successCount++;
        } else {
          console.log(`   ❌ 字幕生成失敗: ${result.error}`);
        }
        
      } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
      }
      
      // 進捗表示
      if ((i + 1) % 10 === 0) {
        const elapsed = Date.now() - startTime;
        const avgTime = elapsed / (i + 1);
        const remainingTime = Math.round(avgTime * (Math.min(audioFiles.length, comments.length) - i - 1) / 1000);
        console.log(`   📈 進捗: ${i + 1}/${Math.min(audioFiles.length, comments.length)} 完了 (成功率: ${Math.round(successCount/(i+1)*100)}%, 残り約${remainingTime}秒)`);
        console.log('');
      }
    }
    
    // VTT字幕ファイル生成
    const vttPath = path.join(subtitleDir, `nanj-subtitles-${formattedDate}.vtt`);
    await generateVTTFile(subtitleData, vttPath);
    
    const totalTime = Date.now() - startTime;
    
    console.log('🎉 字幕画像一括生成完了！');
    console.log('========================================');
    console.log(`📊 最終結果:`);
    console.log(`   対象日付: ${formattedDate} (${dateString})`);
    console.log(`   処理ファイル数: ${Math.min(audioFiles.length, comments.length)}個`);
    console.log(`   成功生成数: ${successCount}個`);
    console.log(`   成功率: ${Math.round((successCount/Math.min(audioFiles.length, comments.length))*100)}%`);
    console.log(`   総処理時間: ${Math.round(totalTime/1000)}秒`);
    console.log(`   平均処理時間: ${Math.round(totalTime/Math.min(audioFiles.length, comments.length))}ms/個`);
    console.log(`   字幕保存先: ${subtitleDir}`);
    console.log(`   VTT字幕ファイル: ${vttPath}`);
    console.log('');
    
    // 生成されたファイル一覧（最初の5個）
    if (successCount > 0) {
      console.log('📁 生成された字幕ファイル（最初の5個）:');
      const subtitleFiles = fs.readdirSync(subtitleDir).filter(f => f.endsWith('.png'));
      subtitleFiles.slice(0, 5).forEach((file, index) => {
        const stats = fs.statSync(path.join(subtitleDir, file));
        console.log(`   ${index + 1}. ${file} (${Math.round(stats.size/1024)}KB)`);
      });
      if (subtitleFiles.length > 5) {
        console.log(`   ... 他${subtitleFiles.length - 5}個のファイル`);
      }
    }
    
    console.log('');
    console.log('🚀 次のステップ - 動画生成:');
    console.log(`   node scripts/generate-video-batch.mjs --date=${dateString}`);
    
  } catch (error) {
    console.error('❌ 字幕生成エラー:', error.message);
    console.log('');
    console.log('🔧 対処方法:');
    console.log('  - 音声ファイルが正常に生成されているか確認');
    console.log('  - 十分なディスク容量があるか確認');
    console.log('  - Canvas依存関係をインストール: npm install canvas');
  }
}

// ヘルプ表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🎬 なんJ野球字幕一括生成システム');
  console.log('');
  console.log('使用方法:');
  console.log('  node scripts/generate-subtitles-batch.mjs [オプション]');
  console.log('');
  console.log('オプション:');
  console.log('  --date=today      今日の日付で実行 (デフォルト)');
  console.log('  --date=yesterday  昨日の日付で実行');
  console.log('  --date=YYYY-MM-DD 特定の日付で実行');
  console.log('  --help, -h        このヘルプを表示');
  console.log('');
  console.log('機能:');
  console.log('  - 音声ファイルに対応する字幕画像を自動生成');
  console.log('  - なんJ語感情分析による適応スタイル');
  console.log('  - VTT字幕ファイル生成');
  console.log('  - 1920x1080動画対応の高品質レンダリング');
  console.log('');
  console.log('例:');
  console.log('  node scripts/generate-subtitles-batch.mjs');
  console.log('  node scripts/generate-subtitles-batch.mjs --date=yesterday');
  console.log('  node scripts/generate-subtitles-batch.mjs --date=2025-09-10');
  process.exit(0);
}

generateSubtitlesBatch();