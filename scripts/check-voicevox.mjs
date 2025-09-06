#!/usr/bin/env node

/**
 * VoiceVox API接続確認スクリプト
 */

console.log('🔍 VoiceVox API接続確認中...');

async function checkVoiceVox() {
  try {
    // APIバージョン確認
    const versionResponse = await fetch('http://localhost:50021/version');
    if (!versionResponse.ok) {
      throw new Error(`HTTP ${versionResponse.status}`);
    }
    const version = await versionResponse.text();
    console.log(`✅ VoiceVox バージョン: ${version}`);

    // スピーカー一覧取得
    const speakersResponse = await fetch('http://localhost:50021/speakers');
    if (!speakersResponse.ok) {
      throw new Error(`HTTP ${speakersResponse.status}`);
    }
    const speakers = await speakersResponse.json();
    console.log(`✅ 利用可能スピーカー: ${speakers.length}個`);
    
    // ずんだもんと四国めたんの確認
    const zundamon = speakers.find(s => s.name === 'ずんだもん');
    const metan = speakers.find(s => s.name === '四国めたん');
    
    if (zundamon) {
      console.log(`✅ ずんだもん: ${zundamon.styles.length}スタイル利用可能`);
    }
    if (metan) {
      console.log(`✅ 四国めたん: ${metan.styles.length}スタイル利用可能`);
    }

    console.log('\n🎉 VoiceVox API正常動作中！');
    console.log('📝 なんJ野球動画生成システムを実行できます');
    console.log('\n🚀 実行方法:');
    console.log('   npm test                    # フルテスト');
    console.log('   node demo-video-generation.mjs  # 今回のデモ');

  } catch (error) {
    console.log('❌ VoiceVox API接続エラー');
    console.log(`エラー詳細: ${error.message}`);
    console.log('\n🔧 対処方法:');
    console.log('1. VoiceVoxアプリケーションが起動しているか確認');
    console.log('2. http://localhost:50021 がブラウザで開けるか確認');
    console.log('3. ファイアウォール設定を確認');
    console.log('4. VoiceVoxを再起動してみる');
  }
}

checkVoiceVox();