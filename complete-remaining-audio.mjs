#!/usr/bin/env node

/**
 * 残りの6個の音声ファイルを完成
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🎤 残り音声ファイル生成完了スクリプト');

// 残りのコメント（53-60番目）
const remainingComments = [
  'あの逆転劇、今年のベストゲームに入るやろ',
  '坂本のバッティング、年齢感じさせんかったな',
  '吉川が決めた瞬間のベンチの盛り上がりよ',
  'あと1つアウト取られてたら終わってたもんな',
  '9回2死の絶望感から一転、野球って面白いわ',
  '中日のリードが一瞬で消えた、恐ろしい攻撃や',
  'テレビ消そうと思った瞬間の逆転劇やったな',
  '巨人ファン、今夜は眠れんやろこれ'
];

const voicePatterns = [
  { id: 2, name: 'zundamon-normal' },
  { id: 3, name: 'zundamon-amaama' },
  { id: 6, name: 'zundamon-tsuntsun' },
  { id: 7, name: 'zundamon-sexy' },
  { id: 0, name: 'metan-normal' },
  { id: 1, name: 'metan-amaama' }
];

async function completeRemainingAudio() {
  try {
    const outputDir = path.join(process.cwd(), 'audio', 'real-nanj-60-files-2025-09-06');
    
    console.log(`📁 出力先: ${outputDir}`);
    
    // 既存ファイル数確認
    const existingFiles = fs.readdirSync(outputDir);
    console.log(`📊 既存ファイル数: ${existingFiles.length}個`);
    
    let successCount = 0;
    
    // 残り8個のコメントを処理
    for (let i = 0; i < remainingComments.length; i++) {
      const comment = remainingComments[i];
      const voicePattern = voicePatterns[i % voicePatterns.length];
      const commentNum = 53 + i; // 53番目から開始
      
      console.log(`🎤 ${commentNum}/60: "${comment.substring(0, 40)}..."`);
      console.log(`   音声パターン: ${voicePattern.name}`);
      
      try {
        // 音声クエリ生成
        const queryResponse = await fetch(`http://localhost:50021/audio_query?text=${encodeURIComponent(comment)}&speaker=${voicePattern.id}`, {
          method: 'POST'
        });
        
        if (queryResponse.ok) {
          const audioQuery = await queryResponse.json();
          
          // 実際の音声合成
          const synthesisResponse = await fetch(`http://localhost:50021/synthesis?speaker=${voicePattern.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(audioQuery)
          });
          
          if (synthesisResponse.ok) {
            const audioData = await synthesisResponse.arrayBuffer();
            
            // ファイル名生成
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `topic3_comment${13+i}_${voicePattern.name}_${timestamp.substring(5, 16)}.wav`;
            const filepath = path.join(outputDir, filename);
            
            // ファイル保存
            fs.writeFileSync(filepath, Buffer.from(audioData));
            
            console.log(`   ✅ 生成成功! ${filename} (${Math.round(audioData.byteLength/1024)}KB)`);
            successCount++;
          } else {
            console.log(`   ❌ 音声合成失敗: ${synthesisResponse.status}`);
          }
        } else {
          console.log(`   ❌ 音声クエリ失敗: ${queryResponse.status}`);
        }
        
      } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
      }
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 最終確認
    const finalFiles = fs.readdirSync(outputDir);
    console.log('');
    console.log('🎉 音声ファイル生成完了確認！');
    console.log(`📊 最終ファイル数: ${finalFiles.length}/60個`);
    console.log(`📈 今回の追加: ${successCount}個`);
    
    if (finalFiles.length >= 60) {
      console.log('✅ 60個の音声ファイル生成完了！');
    } else {
      console.log(`⚠️ まだ${60 - finalFiles.length}個不足しています`);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

completeRemainingAudio();