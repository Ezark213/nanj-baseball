#!/usr/bin/env node

/**
 * 実際の音声ファイル生成スクリプト
 * 2025年9月6日のなんJ語コメントで音声ファイルを作成
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🎤 なんJ語音声ファイル生成開始！');

// 2025年9月6日の最新プロ野球話題を基にしたなんJ語コメント
const nanjComments = [
  'ワイの村上ニキ、復帰してから18本とかやべーやろ',
  '怪我明けでこのペースとか化け物すぎて草',
  'バックスクリーン連発とか、もうこれ半分チートやん',
  '今日のプロ野球、どこも接戦すぎて草生える', 
  'バンテリンドーム5回で動かんの、投手戦かいな',
  'ソフバン海野ニキのタイムリーでついに先制なのだ',
  '9月入って優勝争いガチで面白くなってきたな',
  'この時期のプロ野球が一番アツいわ',
  'どのチームも必死やから神試合連発や'
];

// 音声パターン定義
const voicePatterns = [
  { id: 2, name: 'zundamon-normal' },
  { id: 3, name: 'zundamon-amaama' },
  { id: 6, name: 'zundamon-tsuntsun' },
  { id: 7, name: 'zundamon-sexy' },
  { id: 0, name: 'metan-normal' },
  { id: 1, name: 'metan-amaama' }
];

async function generateAudioFiles() {
  try {
    // 出力ディレクトリ作成
    const outputDir = path.join(process.cwd(), 'audio', 'generated-2025-09-06');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    console.log(`📁 出力先: ${outputDir}`);

    // VoiceVox接続確認
    const versionResponse = await fetch('http://localhost:50021/version');
    const version = await versionResponse.text();
    console.log(`✅ VoiceVox v${version} 接続確認`);

    let totalGenerated = 0;
    let successCount = 0;

    // 各コメントで音声生成
    for (let i = 0; i < nanjComments.length; i++) {
      const comment = nanjComments[i];
      const voicePattern = voicePatterns[i % voicePatterns.length];
      
      console.log(`\n🎤 ${i + 1}/${nanjComments.length}: "${comment}"`);
      console.log(`   音声パターン: ${voicePattern.name} (ID: ${voicePattern.id})`);
      
      try {
        // 音声クエリ生成
        const queryResponse = await fetch(`http://localhost:50021/audio_query?text=${encodeURIComponent(comment)}&speaker=${voicePattern.id}`, {
          method: 'POST'
        });
        
        if (queryResponse.ok) {
          const audioQuery = await queryResponse.json();
          console.log(`   ✅ 音声クエリ生成成功`);
          
          // 実際の音声合成
          const synthesisResponse = await fetch(`http://localhost:50021/synthesis?speaker=${voicePattern.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(audioQuery)
          });
          
          if (synthesisResponse.ok) {
            const audioData = await synthesisResponse.arrayBuffer();
            
            // ファイル名生成（日本語文字を含まない安全なファイル名）
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${voicePattern.name}_comment${i+1}_${timestamp.substring(0, 19)}.wav`;
            const filepath = path.join(outputDir, filename);
            
            // ファイル保存
            fs.writeFileSync(filepath, Buffer.from(audioData));
            
            console.log(`   ✅ 音声ファイル生成成功!`);
            console.log(`   📄 ファイル: ${filename}`);
            console.log(`   📊 サイズ: ${Math.round(audioData.byteLength/1024)}KB`);
            
            successCount++;
          } else {
            console.log(`   ❌ 音声合成失敗: ${synthesisResponse.status}`);
          }
        } else {
          console.log(`   ❌ 音声クエリ失敗: ${queryResponse.status}`);
        }
        
        totalGenerated++;
        
      } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
      }
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 音声ファイル生成完了！');
    console.log('==========================================');
    console.log(`📊 結果サマリー:`);
    console.log(`   処理コメント数: ${totalGenerated}/${nanjComments.length}`);
    console.log(`   成功生成数: ${successCount}個`);
    console.log(`   成功率: ${((successCount/totalGenerated)*100).toFixed(1)}%`);
    console.log(`   保存先: ${outputDir}`);
    
    // 生成されたファイル一覧表示
    if (successCount > 0) {
      console.log('\n📁 生成されたファイル:');
      const files = fs.readdirSync(outputDir);
      files.forEach((file, index) => {
        const stats = fs.statSync(path.join(outputDir, file));
        console.log(`   ${index + 1}. ${file} (${Math.round(stats.size/1024)}KB)`);
      });
    }
    
    console.log('\n🚀 次のステップ:');
    console.log('   1. 生成された音声ファイルを再生して確認');
    console.log('   2. 字幕生成システムのテスト');
    console.log('   3. フル動画合成パイプラインの実行');
    
  } catch (error) {
    console.error('❌ 音声生成エラー:', error.message);
    console.log('\n🔧 対処方法:');
    console.log('  - VoiceVoxアプリケーションが起動しているか確認');
    console.log('  - http://localhost:50021 がアクセス可能か確認');
  }
}

generateAudioFiles();