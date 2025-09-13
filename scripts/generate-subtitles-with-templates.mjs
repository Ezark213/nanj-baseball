/**
 * テンプレート自動適用字幕生成スクリプト
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
  let templateName = 'auto'; // デフォルトは自動選択
  
  args.forEach(arg => {
    if (arg.startsWith('--date=')) {
      dateString = arg.split('=')[1];
    }
    if (arg.startsWith('--template=')) {
      templateName = arg.split('=')[1];
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
  
  return { targetDate, dateString, templateName };
}

// テンプレート設定読み込み
function loadTemplateConfig() {
  const configPath = path.join(process.cwd(), 'config', 'subtitle-templates.json');
  try {
    const configData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('❌ テンプレート設定ファイルが読み込めません:', error.message);
    return null;
  }
}

// コメントから適切なテンプレートを自動選択
function selectTemplate(commentText, templateConfig) {
  if (!templateConfig || !templateConfig.auto_assignment) {
    return 'default';
  }
  
  const keywords = templateConfig.auto_assignment.keywords;
  
  // 興奮系キーワードをチェック
  if (keywords.excited && keywords.excited.some(keyword => commentText.includes(keyword))) {
    return 'excited';
  }
  
  // 落ち込み系キーワードをチェック
  if (keywords.sad && keywords.sad.some(keyword => commentText.includes(keyword))) {
    return 'sad';
  }
  
  return templateConfig.auto_assignment.default_template || 'default';
}

// 音声ファイルからテキストを抽出（簡易版）
function extractTextFromFilename(filename, analysisData = null) {
  // 実際のコメント分析データがある場合はそこから取得
  if (analysisData && analysisData.themes) {
    const themes = analysisData.themes;
    
    // ファイル名からテーマとコメント番号を抽出
    const match = filename.match(/theme(\d+)_comment(\d+)/);
    if (match) {
      const themeNum = parseInt(match[1]);
      const commentNum = parseInt(match[2]);
      
      if (themes[themeNum - 1] && themes[themeNum - 1].comments && themes[themeNum - 1].comments[commentNum - 1]) {
        return themes[themeNum - 1].comments[commentNum - 1];
      }
    }
  }
  
  // フォールバック用のサンプルテキスト
  const fallbackTexts = {
    'theme1': [
      'あーもう9回2死でダメかと思ったわ、やりやがった',
      '代打のタイムリーで同点とかさすがやな',
      '決勝打、これは鳥肌もんやで',
      '長丁場の試合、最後まで見ててよかったわ'
    ],
    'theme2': [
      '今季初の失敗とか、めっちゃレアやん',
      'エースが崩壊とか見てて辛いわ',
      'あの投手が連打浴びるとか信じられんで',
      'ストレートが走ってなかった気がするな'
    ],
    'theme3': [
      '9回2死からの連打、野球は最後まで分からんな',
      'あの場面で諦めんかった打線、根性あるわ',
      '満塁で代打が出てきた時の期待感よ',
      'ここぞという時に打つバッティングやなあ'
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

// Python字幕生成スクリプト作成
function generatePythonScript(audioFiles, subtitleDir, templateConfig, templateOverride = null) {
  const scriptContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
\"\"\"
テンプレート自動適用字幕生成スクリプト
\"\"\"

import os
import json
from PIL import Image, ImageDraw, ImageFont
import textwrap

def select_template(comment_text, template_config):
    \"\"\"コメント内容から適切なテンプレートを選択\"\"\"
    if not template_config or 'auto_assignment' not in template_config:
        return 'default'
    
    keywords = template_config['auto_assignment'].get('keywords', {})
    
    # 興奮系キーワードをチェック
    if 'excited' in keywords:
        for keyword in keywords['excited']:
            if keyword in comment_text:
                return 'excited'
    
    # 落ち込み系キーワードをチェック
    if 'sad' in keywords:
        for keyword in keywords['sad']:
            if keyword in comment_text:
                return 'sad'
    
    return template_config['auto_assignment'].get('default_template', 'default')

def create_subtitle_image(text, output_path, template_name='default', template_config=None):
    \"\"\"指定されたテンプレートで字幕画像を生成\"\"\"
    
    if not template_config or template_name not in template_config.get('templates', {}):
        template_name = 'default'
    
    template = template_config['templates'].get(template_name, {})
    styles = template.get('styles', {})
    
    # デフォルト値設定
    font_size = styles.get('font_size', 52)
    text_color = styles.get('text_color', '#FFFFFF')
    stroke_color = styles.get('stroke_color', '#000000')
    stroke_width = styles.get('stroke_width', 4)
    bg_color = styles.get('background_color', 'rgba(0, 0, 0, 0.75)')
    padding = styles.get('padding', 25)
    margin = styles.get('margin', 30)
    
    # フォント設定
    try:
        font_family = styles.get('font_family', 'Arial')
        if 'Black' in font_family:
            font = ImageFont.truetype('arial.ttf', font_size)  # Windows
        else:
            font = ImageFont.truetype('arial.ttf', font_size)
    except:
        font = ImageFont.load_default()
    
    # テキスト分割とサイズ計算
    max_width = 1000
    lines = textwrap.wrap(text, width=int(max_width / (font_size * 0.6)))
    if not lines:
        lines = [text]
    
    # 画像サイズ計算
    line_height = int(font_size * 1.3)
    text_height = len(lines) * line_height
    
    canvas_width = min(max_width + (padding * 2) + (margin * 2), 1920)
    canvas_height = max(text_height + (padding * 2) + (margin * 2), font_size + 60)
    
    # 画像作成
    img = Image.new('RGBA', (canvas_width, canvas_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 背景描画
    bg_x = margin
    bg_y = margin
    bg_width = canvas_width - (margin * 2)
    bg_height = canvas_height - (margin * 2)
    
    # RGBA背景色をパース
    if bg_color.startswith('rgba'):
        # rgba(r, g, b, a) をパース
        rgba_str = bg_color.replace('rgba(', '').replace(')', '')
        rgba_values = [float(x.strip()) for x in rgba_str.split(',')]
        bg_rgba = (int(rgba_values[0]), int(rgba_values[1]), int(rgba_values[2]), int(rgba_values[3] * 255))
        draw.rectangle([bg_x, bg_y, bg_x + bg_width, bg_y + bg_height], fill=bg_rgba)
    
    # テキスト描画
    start_y = (canvas_height - text_height) / 2 + (font_size / 2)
    
    for i, line in enumerate(lines):
        text_bbox = draw.textbbox((0, 0), line, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        x = (canvas_width - text_width) / 2
        y = start_y + (i * line_height)
        
        # 文字色をパース
        if text_color.startswith('#'):
            text_rgb = tuple(int(text_color[1:][i:i+2], 16) for i in (0, 2, 4))
        else:
            text_rgb = (255, 255, 255)
        
        # 縁取り色をパース
        if stroke_color.startswith('#'):
            stroke_rgb = tuple(int(stroke_color[1:][i:i+2], 16) for i in (0, 2, 4))
        else:
            stroke_rgb = (0, 0, 0)
        
        # 縁取り描画
        for dx in range(-stroke_width, stroke_width + 1):
            for dy in range(-stroke_width, stroke_width + 1):
                if dx == 0 and dy == 0:
                    continue
                draw.text((x + dx, y + dy), line, fill=stroke_rgb, font=font)
        
        # メインテキスト描画
        draw.text((x, y), line, fill=text_rgb, font=font)
    
    # 画像保存
    img.save(output_path, 'PNG')
    return os.path.getsize(output_path)

# テンプレート設定読み込み
template_config = ${JSON.stringify(templateConfig, null, 2)}

# 音声ファイルと対応テキスト
audio_data = {
${audioFiles.map(file => {
    const baseName = path.parse(file).name;
    const text = extractTextFromFilename(baseName);
    const templateName = templateOverride || selectTemplate(text, templateConfig);
    return `  "${baseName}": {"text": "${text}", "template": "${templateName}"}`;
  }).join(',\n')}
}

# 字幕画像生成
total_files = len(audio_data)
success_count = 0
total_size = 0

print("🎬 テンプレート自動適用字幕生成開始！")
print(f"📁 出力先: ${subtitleDir.replace(/\\/g, '/')}")
print(f"🎨 利用可能テンプレート: {', '.join(template_config['templates'].keys())}")
print()

for i, (filename, data) in enumerate(audio_data.items(), 1):
    try:
        output_file = f"{filename}_subtitle.png"
        output_path = os.path.join(r"${subtitleDir}", output_file)
        
        text = data["text"]
        template_name = data["template"]
        
        file_size = create_subtitle_image(text, output_path, template_name, template_config)
        total_size += file_size
        success_count += 1
        
        print(f"🎬 {i}/{total_files}: {output_file}")
        print(f"   テキスト: \\"{text}\\"")
        print(f"   テンプレート: {template_name}")
        print(f"   ファイルサイズ: {file_size/1024:.1f}KB")
        print(f"   ✅ 生成完了")
        print()
        
    except Exception as e:
        print(f"❌ {filename}: {e}")

print("🎉 字幕生成完了！")
print("=" * 50)
print(f"📊 結果:")
print(f"   総ファイル数: {total_files}個")
print(f"   成功: {success_count}個")
print(f"   成功率: {success_count/total_files*100:.1f}%")
print(f"   総サイズ: {total_size/1024/1024:.1f}MB")
print(f"   保存先: {subtitleDir}")
`;
  
  return scriptContent;
}

async function main() {
  const { targetDate, dateString, templateName } = parseArgs();
  const formattedDate = formatDate(targetDate);
  
  console.log('🎬 テンプレート自動適用字幕生成開始！');
  console.log('=' * 50);
  console.log(`📅 対象日付: ${formattedDate} (${dateString})`);
  console.log(`🎨 テンプレート: ${templateName === 'auto' ? '自動選択' : templateName}`);
  console.log();
  
  // テンプレート設定読み込み
  const templateConfig = loadTemplateConfig();
  if (!templateConfig) {
    console.error('❌ テンプレート設定の読み込みに失敗しました');
    process.exit(1);
  }
  
  console.log(`🎨 利用可能テンプレート: ${Object.keys(templateConfig.templates).join(', ')}`);
  console.log();
  
  // 音声ディレクトリ確認
  const audioDir = path.join(process.cwd(), 'audio', `nanj-${formattedDate}`);
  const subtitleDir = path.join(process.cwd(), 'subtitles', `nanj-${formattedDate}-template`);
  
  console.log(`📁 音声ディレクトリ: ${audioDir}`);
  console.log(`📁 字幕出力先: ${subtitleDir}`);
  
  if (!fs.existsSync(audioDir)) {
    console.error(`❌ 音声ディレクトリが見つかりません: ${audioDir}`);
    process.exit(1);
  }
  
  // 音声ファイル取得
  const audioFiles = fs.readdirSync(audioDir)
    .filter(file => file.endsWith('.wav') || file.endsWith('.mp3'))
    .sort();
  
  console.log(`🎤 音声ファイル: ${audioFiles.length}個`);
  console.log();
  
  if (audioFiles.length === 0) {
    console.error('❌ 音声ファイルが見つかりません');
    process.exit(1);
  }
  
  // 字幕ディレクトリ作成
  if (!fs.existsSync(subtitleDir)) {
    fs.mkdirSync(subtitleDir, { recursive: true });
  }
  
  // 分析データ読み込み（あれば）
  let analysisData = null;
  const analysisPath = path.join(process.cwd(), 'output', `nanj-sites-${formattedDate}`, 'nanj-analysis-result.json');
  if (fs.existsSync(analysisPath)) {
    try {
      analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
    } catch (error) {
      console.log('ℹ️ 分析データの読み込みに失敗、フォールバックテキストを使用');
    }
  }
  
  // Python字幕生成スクリプト作成
  console.log('📝 テンプレート適用Python字幕生成スクリプト作成中...');
  const scriptContent = generatePythonScript(
    audioFiles, 
    subtitleDir, 
    templateConfig, 
    templateName === 'auto' ? null : templateName
  );
  
  const scriptPath = path.join(subtitleDir, 'subtitle_template_script.py');
  fs.writeFileSync(scriptPath, scriptContent, 'utf-8');
  console.log(`✅ スクリプト作成完了: ${scriptPath}`);
  console.log();
  
  // Python実行
  console.log('🎬 テンプレート自動適用字幕画像生成開始...');
  console.log();
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [scriptPath], { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      output += text;
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      errorOutput += text;
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log();
        console.log('✅ テンプレート自動適用字幕生成が完了しました！');
        console.log(`🎯 次は字幕付き動画を生成できます。`);
        console.log();
        console.log('📋 使用方法:');
        console.log('  - 自動テンプレート選択: node scripts/generate-subtitles-with-templates.mjs --date=today');
        console.log('  - 指定テンプレート: node scripts/generate-subtitles-with-templates.mjs --date=today --template=excited');
        console.log(`  - 利用可能テンプレート: ${Object.keys(templateConfig.templates).join(', ')}`);
        resolve();
      } else {
        console.error(`❌ Python実行エラー (exit code: ${code})`);
        if (errorOutput) {
          console.error('エラー詳細:', errorOutput);
        }
        reject(new Error(`Python script failed with exit code ${code}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('❌ Pythonプロセス起動エラー:', error.message);
      console.log();
      console.log('🔧 対処方法:');
      console.log('  - Pythonがインストールされているか確認');
      console.log('  - pip install pillow でPILをインストール');
      console.log('  - パス設定を確認');
      reject(error);
    });
  });
}

// メイン実行部分
if (import.meta.url.startsWith('file://') && process.argv[1].includes('generate-subtitles-with-templates.mjs')) {
  main().catch(error => {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  });
}