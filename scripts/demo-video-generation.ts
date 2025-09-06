#!/usr/bin/env node

/**
 * なんJ野球動画自動生成 - リアルタイムデモ実行
 * 2025年9月6日の最新プロ野球情報を基にした動画生成
 */

import { FullAutomationPipeline } from './src/integration/FullAutomationPipeline.js';
import { checkSystemHealth } from './src/voice/index.js';
import * as path from 'path';

// 2025年9月6日の最新プロ野球話題を基にしたなんJ語コメント
const nanjComments = [
  // トピック1: 村上宗隆の復活ホームラン量産
  'ワイの村上ニキ、復帰してから18本とかやべーやろ',
  '怪我明けでこのペースとか化け物すぎて草',
  'バックスクリーン連発とか、もうこれ半分チートやん',
  
  // トピック2: 9月6日の熱戦展開
  '今日のプロ野球、どこも接戦すぎて草生える', 
  'バンテリンドーム5回で動かんの、投手戦かいな',
  'ソフバン海野ニキのタイムリーでついに先制なのだ',
  
  // トピック3: 優勝争い終盤戦
  '9月入って優勝争いガチで面白くなってきたな',
  'この時期のプロ野球が一番アツいわ',
  'どのチームも必死やから神試合連発や'
];

async function main() {
  console.log('🎬 なんJ野球動画自動生成 - 2025年9月6日版');
  console.log('==============================================');
  console.log('📰 最新プロ野球情報:');
  console.log('  - 村上宗隆 復帰後18本塁打の爆発的ペース');
  console.log('  - 9月6日 複数球場で熱戦展開中');
  console.log('  - 優勝争い終盤戦で各チーム必死の攻防');
  console.log('');

  // 1. システム状態確認
  console.log('🔍 1. システム状態確認...');
  const isHealthy = await checkSystemHealth();
  
  if (!isHealthy) {
    console.log('❌ VoiceVoxが利用できません');
    console.log('VoiceVoxアプリケーションを起動してから再実行してください');
    console.log('URL: http://localhost:50021');
    return;
  }
  console.log('✅ VoiceVox接続確認完了\n');

  // 2. パイプライン初期化
  console.log('🚀 2. フルオートメーションパイプライン初期化...');
  const outputDir = path.join(process.cwd(), 'output', 'demo-2025-09-06');
  
  const pipeline = new FullAutomationPipeline({
    outputBaseDir: outputDir,
    voiceConfig: {
      autoCleanup: { enabled: false } // デモ用にファイル保持
    }
  });
  console.log(`📁 出力先: ${outputDir}\n`);

  try {
    // 3. 単一動画生成（最も話題性の高いコメント）
    console.log('🎤 3. 単一動画生成テスト...');
    const featuredComment = 'ワイの村上ニキ、復帰してから18本とかやべーやろ';
    console.log(`💬 選択コメント: "${featuredComment}"`);
    
    const startTime = Date.now();
    const singleResult = await pipeline.generateFullVideo(featuredComment, {
      voicePattern: 'zundamon-excited', // 興奮した声で
      subtitlePreset: 'nanj-excited',   // 興奮字幕で
      keepIntermediateFiles: true       // デモ用に中間ファイル保持
    });

    if (singleResult.success) {
      const duration = Date.now() - startTime;
      console.log(`✅ 単一動画生成成功! (${duration}ms)`);
      console.log(`🎥 出力動画: ${singleResult.outputs.videoFiles[0]}`);
      console.log(`📊 処理詳細:`);
      console.log(`   音声ファイル: ${singleResult.outputs.audioFiles.length}個`);
      console.log(`   字幕ファイル: ${singleResult.outputs.subtitleFiles.length}個`);
      console.log(`   動画ファイル: ${singleResult.outputs.videoFiles.length}個`);
    } else {
      console.log(`❌ 単一動画生成失敗: ${singleResult.error}`);
      await pipeline.shutdownFull();
      return;
    }

    // 4. バッチ動画生成（複数コメント一括処理）
    console.log('\n🎬 4. バッチ動画生成...');
    const batchComments = nanjComments.slice(0, 5); // 最初の5つのコメント
    console.log(`📝 処理コメント数: ${batchComments.length}件`);
    
    batchComments.forEach((comment, index) => {
      console.log(`   ${index + 1}. "${comment}"`);
    });

    let completedCount = 0;
    const batchStartTime = Date.now();
    
    const batchResults = await pipeline.generateBatchVideos(batchComments, {
      concurrency: 2,
      multipleVoicePatterns: true,
      voicePatternCount: 2,
      keepIntermediateFiles: true,
      onProgress: (completed, total) => {
        if (completed > completedCount) {
          completedCount = completed;
          console.log(`   📈 進捗: ${completed}/${total} 完了`);
        }
      }
    });

    const batchDuration = Date.now() - batchStartTime;
    const successCount = batchResults.filter(r => r.success).length;
    const totalVideoFiles = batchResults.reduce((sum, r) => sum + r.outputs.videoFiles.length, 0);

    console.log(`🎉 バッチ処理完了! (${(batchDuration/1000).toFixed(2)}秒)`);
    console.log(`📊 結果サマリー:`);
    console.log(`   成功率: ${successCount}/${batchComments.length} (${((successCount/batchComments.length)*100).toFixed(1)}%)`);
    console.log(`   総動画ファイル: ${totalVideoFiles}個`);
    console.log(`   平均処理時間: ${(batchDuration/batchComments.length/1000).toFixed(2)}秒/コメント`);

    // 5. 生成結果の詳細表示
    console.log('\n📋 5. 生成結果詳細:');
    console.log('----------------------------------------');
    
    // 単一動画の結果
    console.log('🎥 単一動画生成:');
    console.log(`   コメント: "${featuredComment}"`);
    console.log(`   動画ファイル: ${path.basename(singleResult.outputs.videoFiles[0])}`);
    
    // バッチ動画の結果
    console.log('\n🎬 バッチ動画生成:');
    batchResults.forEach((result, index) => {
      if (result.success) {
        console.log(`   ${index + 1}. ✅ "${result.text.substring(0, 30)}${result.text.length > 30 ? '...' : ''}"`);
        result.outputs.videoFiles.forEach(file => {
          console.log(`      📹 ${path.basename(file)}`);
        });
      } else {
        console.log(`   ${index + 1}. ❌ "${result.text.substring(0, 30)}..." - ${result.error}`);
      }
    });

    // 6. システム統計情報
    console.log('\n📊 6. システム統計情報:');
    const systemStats = await pipeline.checkFullSystemStatus();
    console.log(`   VoiceVox: ${systemStats.voice.voicevox.isConnected ? '✅' : '❌'} (v${systemStats.voice.voicevox.version})`);
    console.log(`   字幕プリセット: ${systemStats.subtitle.presetsCount}種類`);
    console.log(`   Python動画処理: ${systemStats.video.pythonAvailable ? '✅' : '❌'}`);

    // 7. 完了メッセージ
    console.log('\n🎉 なんJ野球動画自動生成デモ完了!');
    console.log('==========================================');
    console.log('🎯 今回の成果:');
    console.log(`   ✨ 2025年9月6日の最新プロ野球情報を基にしたリアルタイム動画生成`);
    console.log(`   🎤 多様な音声パターン（興奮、標準等）による表現力豊かな読み上げ`); 
    console.log(`   📝 なんJ語専用字幕システムによる視覚的訴求力`);
    console.log(`   🎥 完全自動化された高品質動画合成`);
    console.log('');
    console.log('📁 生成ファイルの確認:');
    console.log(`   ${outputDir}`);
    console.log('');
    console.log('🚀 次のステップ:');
    console.log('   1. 生成された動画を確認・視聴');
    console.log('   2. より多くのなんJ語コメントでの大量生成');
    console.log('   3. 背景動画やエフェクトのカスタマイズ');

  } catch (error) {
    console.error('❌ 動画生成エラー:', error);
  } finally {
    await pipeline.shutdownFull();
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// 実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ デモ実行エラー:', error);
    process.exit(1);
  });
}