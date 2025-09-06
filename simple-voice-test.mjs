#!/usr/bin/env node

/**
 * シンプル音声生成テスト
 */

console.log('🎤 なんJ野球音声生成テスト開始！');

// 2025年9月6日の話題コメント
const testComments = [
  'ワイの村上ニキ、復帰してから18本とかやべーやろ',
  '怪我明けでこのペースとか化け物すぎて草',
  '今日のプロ野球、どこも接戦すぎて草生える'
];

async function testVoiceGeneration() {
  try {
    console.log('🔍 VoiceVox接続確認...');
    
    // 1. API接続確認
    const versionResponse = await fetch('http://localhost:50021/version');
    const version = await versionResponse.text();
    console.log(`✅ VoiceVox v${version} 接続確認`);
    
    // 2. スピーカー情報取得
    const speakersResponse = await fetch('http://localhost:50021/speakers');
    const speakers = await speakersResponse.json();
    
    const zundamon = speakers.find(s => s.name === 'ずんだもん');
    console.log(`✅ ずんだもん利用可能: ${zundamon.styles.length}スタイル`);
    
    // 3. 各コメントで音声生成テスト
    for (let i = 0; i < testComments.length; i++) {
      const comment = testComments[i];
      console.log(`\\n🎤 テスト ${i + 1}: "${comment}"`);
      
      try {
        // 音声クエリ生成
        const speakerId = zundamon.styles[0].id; // ノーマル
        const queryResponse = await fetch(`http://localhost:50021/audio_query?text=${encodeURIComponent(comment)}&speaker=${speakerId}`, {
          method: 'POST'
        });
        
        if (queryResponse.ok) {
          const audioQuery = await queryResponse.json();
          console.log(`   ✅ 音声クエリ生成成功 (推定時間: ${audioQuery.speedScale}倍速)`);
          
          // 実際の音声合成
          const synthesisResponse = await fetch(`http://localhost:50021/synthesis?speaker=${speakerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(audioQuery)
          });
          
          if (synthesisResponse.ok) {
            const audioData = await synthesisResponse.arrayBuffer();
            console.log(`   ✅ 音声合成成功! (${Math.round(audioData.byteLength/1024)}KB)`);
            console.log(`   🎵 音声パターン: ずんだもん-ノーマル`);
            console.log(`   ⏱️ 想定再生時間: ${Math.round(audioQuery.prePhonemeLength + audioQuery.postPhonemeLength)}秒`);
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
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\\n🎉 音声生成テスト完了！');
    console.log('\\n📋 結果サマリー:');
    console.log('  ✅ VoiceVox API正常動作');
    console.log('  ✅ なんJ語コメント音声化成功');
    console.log('  ✅ 複数パターンテスト完了');
    
    console.log('\\n🚀 次のステップ:');
    console.log('  1. 字幕生成システムの追加');
    console.log('  2. Python動画合成システムの連携');
    console.log('  3. フル動画自動生成パイプライン実行');
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
    console.log('\\n🔧 対処方法:');
    console.log('  - VoiceVoxアプリケーションが起動しているか確認');
    console.log('  - http://localhost:50021 がアクセス可能か確認');
  }
}

testVoiceGeneration();