/**
 * skia-canvasを使った字幕画像生成スクリプト
 * generate-daily-audio.mjsで生成された音声ファイルに対応する字幕を自動生成
 */

import * as fs from 'fs';
import * as path from 'path';
import { Canvas, FontLibrary } from 'skia-canvas';

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
          console.error(`❌ 無効な日付形式: ${dateValue}`);
          console.log('使用例: --date=2023-01-01 または --date=today または --date=yesterday');
          process.exit(1);
        }
        dateString = dateValue;
      }
      break;
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

// なんJ語専用スタイル設定
const subtitleStyles = {
  // なんJ語専用スタイル
  nanjDefault: {
    fontSize: 52,
    fontFamily: 'Arial, sans-serif',
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
    fontFamily: 'Arial, sans-serif',
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

// 音声ファイルからテキストを推測
function extractTextFromFilename(filename) {
  // 基本的なテキスト推測ロジック
  const fallbackTexts = {
    'theme1': [
      'あーもう9回2死でダメかと思ったわ、やりやがった',
      '代打のタイムリーで同点とかさすがやな',
      '決勝打、これは鳥肌もんやで',
      '長丁場の試合、最後まで見ててよかったわ',
      '球場が静まり返った瞬間やったな',
      'ソロHRから流れ変わった気がするわ',
      '連続タイムリーで希望見えてきたんよな',
      '5連打はえぐすぎるやろ、相手ファン可哀想',
      'あの投手の勝利とか予想できんかったわ'
    ],
    'theme2': [
      '今季初の失敗とか、めっちゃレアやん',
      'エースが崩壊とか見てて辛いわ',
      'あの投手が連打浴びるとか信じられんで',
      'ストレートが走ってなかった気がするな',
      'タイトル争いしてたのにここで失敗は痛いわ',
      'ファン、あの選手に当たりそうで心配やな',
      '9回2死で登場の時点で嫌な予感してた',
      '表情、マウンドで呆然としてたやん',
      'この1敗で順位争いに影響出そうやな'
    ],
    'theme3': [
      '9回2死からの連打、野球は最後まで分からんな',
      'あの場面で諦めんかった打線、根性あるわ',
      '満塁で代打が出てきた時の期待感よ',
      'ここぞという時に打つバッティングやなあ',
      '代打策がハマりまくった監督の采配や',
      '2死から始まった奇跡、鳥肌立ったで',
      'ホームの観客、大興奮やったろうな',
      '9回裏の攻撃時間だけで30分くらいかかったやろ',
      'タイムリー、流れを引き寄せたんかな'
    ]
  };
  
  // ファイル名から適切なテキストを推測
  const themeMatch = filename.match(/theme(\d+)_comment(\d+)/);
  if (themeMatch) {
    const themeNum = parseInt(themeMatch[1]);
    const commentNum = parseInt(themeMatch[2]);
    const themeKey = `theme${themeNum}`;
    
    if (fallbackTexts[themeKey]) {
      const comments = fallbackTexts[themeKey];
      return comments[(commentNum - 1) % comments.length];
    }
  }
  
  return 'なんJコメント';
}

// テキストから適切なスタイルを選択
function selectStyleFromText(text) {
  const excitedKeywords = ['やった', 'すげー', '神', '最高', '興奮', '鳥肌', 'やりやがった'];
  const sadKeywords = ['あかん', '終わった', '最悪', '痛い', '残念', 'ダメ', '失敗'];
  
  if (excitedKeywords.some(keyword => text.includes(keyword))) {
    return 'excited';
  }
  
  if (sadKeywords.some(keyword => text.includes(keyword))) {
    return 'sad';
  }
  
  return 'nanjDefault';
}

// テキストを複数行に分割
function wrapText(text, maxWidth, fontSize) {
  // 文字幅を概算で計算
  const charWidth = fontSize * 0.6; // 概算
  const maxCharsPerLine = Math.floor(maxWidth / charWidth);
  
  if (text.length <= maxCharsPerLine) {
    return [text];
  }
  
  const words = text.split('');
  const lines = [];
  let currentLine = '';
  
  for (const char of words) {
    if (currentLine.length < maxCharsPerLine) {
      currentLine += char;
    } else {
      lines.push(currentLine);
      currentLine = char;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// 字幕画像を生成
async function generateSubtitleImage(text, outputPath, styleName = 'nanjDefault') {
  const style = subtitleStyles[styleName] || subtitleStyles.nanjDefault;
  
  // テキストを複数行に分割
  const lines = wrapText(text, style.maxWidth, style.fontSize);
  
  // キャンバスサイズを計算
  const lineHeight = style.fontSize * style.lineHeight;
  const textHeight = lines.length * lineHeight;
  
  const canvasWidth = Math.min(style.maxWidth + (style.padding * 2) + (style.margin * 2), 1920);
  const canvasHeight = Math.max(textHeight + (style.padding * 2) + (style.margin * 2), style.fontSize + 60);
  
  // キャンバス作成
  const canvas = new Canvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  
  // 背景を透明に設定
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // 背景を描画
  if (style.backgroundColor) {
    const bgX = style.margin;
    const bgY = style.margin;
    const bgWidth = canvasWidth - (style.margin * 2);
    const bgHeight = canvasHeight - (style.margin * 2);
    
    // RGBA色をパース
    if (style.backgroundColor.startsWith('rgba')) {
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
    }
  }
  
  // フォント設定
  ctx.font = `${style.fontSize}px ${style.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // テキストを描画
  const startY = (canvasHeight - textHeight) / 2 + (style.fontSize / 2);
  
  lines.forEach((line, index) => {
    const x = canvasWidth / 2;
    const y = startY + (index * lineHeight);
    
    // 影を描画
    if (style.shadow) {
      ctx.fillStyle = style.shadow.color;
      ctx.fillText(line, x + style.shadow.offsetX, y + style.shadow.offsetY);
    }
    
    // 縁取りを描画
    if (style.strokeColor && style.strokeWidth > 0) {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth;
      ctx.strokeText(line, x, y);
    }
    
    // メインテキストを描画
    ctx.fillStyle = style.color;
    ctx.fillText(line, x, y);
  });
  
  // 画像を保存
  const buffer = await canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  return {
    filePath: outputPath,
    fileSize: buffer.length,
    dimensions: { width: canvasWidth, height: canvasHeight },
    style: styleName,
    linesCount: lines.length
  };
}

async function main() {
  const { targetDate, dateString } = parseArgs();
  const formattedDate = formatDate(targetDate);
  
  console.log('🎬 skia-canvas字幕画像生成開始！');
  console.log('=' * 50);
  console.log(`📅 対象日付: ${formattedDate} (${dateString})`);
  console.log();
  
  // 音声ディレクトリとファイルの確認
  const audioDir = path.join(process.cwd(), 'audio', `nanj-${formattedDate}`);
  const subtitleDir = path.join(process.cwd(), 'subtitles', `nanj-${formattedDate}-skia`);
  
  console.log(`📁 音声ディレクトリ: ${audioDir}`);
  console.log(`📁 字幕出力先: ${subtitleDir}`);
  
  if (!fs.existsSync(audioDir)) {
    console.error(`❌ 音声ディレクトリが見つかりません: ${audioDir}`);
    console.log();
    console.log('🔧 対処方法:');
    console.log('  - 音声ファイルを生成: node scripts/generate-daily-audio.mjs --date=' + dateString);
    console.log('  - または既存の日付を指定: --date=2025-09-12');
    process.exit(1);
  }
  
  // 音声ファイル一覧を取得
  const audioFiles = fs.readdirSync(audioDir)
    .filter(file => file.endsWith('.wav') || file.endsWith('.mp3'))
    .sort();
  
  console.log(`🎤 音声ファイル: ${audioFiles.length}個`);
  
  if (audioFiles.length === 0) {
    console.error('❌ 音声ファイルが見つかりません');
    process.exit(1);
  }
  
  // 字幕ディレクトリを作成
  if (!fs.existsSync(subtitleDir)) {
    fs.mkdirSync(subtitleDir, { recursive: true });
  }
  
  console.log();
  console.log(`🎨 利用可能スタイル: ${Object.keys(subtitleStyles).join(', ')}`);
  console.log();
  
  // 字幕画像を生成
  let successCount = 0;
  let totalSize = 0;
  const styleUsage = {};
  
  for (let i = 0; i < audioFiles.length; i++) {
    const audioFile = audioFiles[i];
    const baseName = path.parse(audioFile).name;
    
    try {
      // テキストを推測
      const text = extractTextFromFilename(baseName);
      
      // スタイルを自動選択
      const styleName = selectStyleFromText(text);
      styleUsage[styleName] = (styleUsage[styleName] || 0) + 1;
      
      // 出力ファイルパス
      const outputFile = `${baseName}_subtitle.png`;
      const outputPath = path.join(subtitleDir, outputFile);
      
      // 字幕画像を生成
      const result = await generateSubtitleImage(text, outputPath, styleName);
      
      totalSize += result.fileSize;
      successCount++;
      
      console.log(`🎬 ${i + 1}/${audioFiles.length}: ${outputFile}`);
      console.log(`   テキスト: "${text}"`);
      console.log(`   スタイル: ${styleName} (${result.linesCount}行)`);
      console.log(`   サイズ: ${result.dimensions.width}×${result.dimensions.height}`);
      console.log(`   ファイルサイズ: ${(result.fileSize / 1024).toFixed(1)}KB`);
      console.log(`   ✅ 生成完了`);
      console.log();
      
    } catch (error) {
      console.error(`❌ ${baseName}: ${error.message}`);
    }
  }
  
  // 結果サマリー
  console.log('🎉 skia-canvas字幕生成完了！');
  console.log('=' * 50);
  console.log(`📊 結果:`);
  console.log(`   対象日付: ${formattedDate} (${dateString})`);
  console.log(`   音声ファイル数: ${audioFiles.length}個`);
  console.log(`   字幕画像数: ${successCount}個`);
  console.log(`   成功率: ${(successCount / audioFiles.length * 100).toFixed(1)}%`);
  console.log(`   総サイズ: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
  console.log(`   保存先: ${subtitleDir}`);
  console.log();
  console.log('🎨 スタイル使用状況:');
  Object.entries(styleUsage).forEach(([style, count]) => {
    console.log(`   ${style}: ${count}個`);
  });
  console.log();
  console.log('✅ skia-canvas による字幕生成が完了しました！');
  console.log('🎯 次は字幕付き動画を生成できます。');
}

if (import.meta.url.startsWith('file://') && process.argv[1].includes('generate-subtitles-skia-canvas.mjs')) {
  main().catch(error => {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}