#!/usr/bin/env node

/**
 * なんJ野球動画自動生成システム - フルテスト実行ファイル
 * 
 * 使用方法:
 * 1. VoiceVoxアプリケーションを起動 (http://localhost:50021)
 * 2. Python環境を準備: pip install -r python/requirements.txt
 * 3. npm install canvas (字幕生成用)
 * 4. npx ts-node examples/video-generation-test.ts
 */

import { FullAutomationPipeline } from '../src/integration/FullAutomationPipeline.js';
import { checkSystemHealth } from '../src/voice/index.js';
import * as path from 'path';
import * as fs from 'fs';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  outputs?: string[];
  error?: string;
}

async function main() {
  console.log('🎬 なんJ野球動画自動生成システム - フルテスト');
  console.log('================================================\n');

  const testResults: TestResult[] = [];

  // 1. システム状態確認
  console.log('1. システム状態確認...');
  const systemCheckStart = Date.now();
  
  try {
    // VoiceVox接続確認
    const voiceHealthy = await checkSystemHealth();
    if (!voiceHealthy) {
      throw new Error('VoiceVoxに接続できません。http://localhost:50021 でサーバーが起動しているか確認してください。');
    }
    console.log('   ✅ VoiceVox接続確認');

    testResults.push({
      testName: 'VoiceVox接続確認',
      success: true,
      duration: Date.now() - systemCheckStart
    });
  } catch (error) {
    console.log('   ❌ VoiceVox接続エラー');
    testResults.push({
      testName: 'VoiceVox接続確認', 
      success: false,
      duration: Date.now() - systemCheckStart,
      error: error instanceof Error ? error.message : String(error)
    });
    
    console.log('\n❌ VoiceVoxが利用できないため、テストを中止します。');
    console.log('VoiceVoxアプリケーションを起動してから再実行してください。');
    process.exit(1);
  }

  // 2. パイプライン初期化
  console.log('\n2. フルオートメーションパイプライン初期化...');
  const initStart = Date.now();
  
  let pipeline: FullAutomationPipeline;
  try {
    const outputDir = path.join(process.cwd(), 'output', 'test');
    
    pipeline = new FullAutomationPipeline({
      outputBaseDir: outputDir,
      voiceConfig: {
        autoCleanup: { enabled: false } // テスト用にクリーンアップ無効
      },
      videoConfig: {
        pythonPath: 'python',
        timeout: 120000 // 2分タイムアウト
      }
    });

    console.log('   ✅ パイプライン初期化完了');
    testResults.push({
      testName: 'パイプライン初期化',
      success: true,
      duration: Date.now() - initStart
    });
  } catch (error) {
    console.log('   ❌ パイプライン初期化エラー');
    testResults.push({
      testName: 'パイプライン初期化',
      success: false, 
      duration: Date.now() - initStart,
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }

  // 3. システム詳細確認
  console.log('\n3. システム詳細確認...');
  const detailCheckStart = Date.now();
  
  try {
    const fullStatus = await pipeline.checkFullSystemStatus();
    
    console.log('   VoiceVox情報:');
    console.log(`     接続状態: ${fullStatus.voice.voicevox.isConnected ? '✅' : '❌'}`);
    console.log(`     バージョン: ${fullStatus.voice.voicevox.version}`);
    console.log(`     スピーカー数: ${fullStatus.voice.voicevox.speakers}個`);
    
    console.log('   字幕システム情報:');
    console.log(`     プリセット数: ${fullStatus.subtitle.presetsCount}個`);
    console.log(`     フォント読み込み: ${fullStatus.subtitle.fontsLoaded ? '✅' : '❌'}`);
    
    console.log('   動画システム情報:');
    console.log(`     Python利用可能: ${fullStatus.video.pythonAvailable ? '✅' : '❌'}`);
    console.log(`     スクリプト存在: ${fullStatus.video.scriptExists ? '✅' : '❌'}`);
    
    if (fullStatus.video.errors.length > 0) {
      console.log('   ⚠️ 動画システム警告:');
      fullStatus.video.errors.forEach(error => {
        console.log(`     - ${error}`);
      });
    }

    testResults.push({
      testName: 'システム詳細確認',
      success: fullStatus.video.pythonAvailable && fullStatus.video.scriptExists,
      duration: Date.now() - detailCheckStart
    });
  } catch (error) {
    console.log('   ❌ システム詳細確認エラー');
    testResults.push({
      testName: 'システム詳細確認',
      success: false,
      duration: Date.now() - detailCheckStart,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // 4. 単一動画生成テスト
  console.log('\n4. 単一動画生成テスト...');
  const singleTestTexts = [
    'ホームランなのだ！素晴らしいプレイなのだ！',
    '草生える試合展開やでほんま',
    '大谷ニキの二刀流、やっぱり化け物やんけ'
  ];

  for (let i = 0; i < singleTestTexts.length; i++) {
    const text = singleTestTexts[i];
    const testStart = Date.now();
    
    console.log(`\n   テスト ${i + 1}: "${text}"`);
    
    try {
      const result = await pipeline.generateFullVideo(text, {
        voicePattern: 'zundamon-normal',
        subtitlePreset: 'nanj-default',
        cleanupTemp: false, // テスト用に中間ファイル保持
        keepIntermediateFiles: true
      });

      if (result.success) {
        console.log(`     ✅ 成功 (${result.processingTime}ms)`);
        console.log(`     📁 音声ファイル: ${result.outputs.audioFiles.length}個`);
        console.log(`     📝 字幕ファイル: ${result.outputs.subtitleFiles.length}個`);
        console.log(`     🎥 動画ファイル: ${result.outputs.videoFiles.length}個`);
        
        if (result.outputs.videoFiles.length > 0) {
          console.log(`     📹 出力: ${path.basename(result.outputs.videoFiles[0])}`);
        }

        testResults.push({
          testName: `単一動画生成_${i + 1}`,
          success: true,
          duration: Date.now() - testStart,
          outputs: result.outputs.videoFiles
        });
      } else {
        throw new Error(result.error || '動画生成に失敗');
      }
    } catch (error) {
      console.log(`     ❌ 失敗: ${error}`);
      testResults.push({
        testName: `単一動画生成_${i + 1}`,
        success: false,
        duration: Date.now() - testStart,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 5. 複数パターン動画生成テスト
  console.log('\n5. 複数パターン動画生成テスト...');
  const multiTestStart = Date.now();
  const multiTestText = '今日の試合、神試合すぎて草やで〜';
  
  try {
    console.log(`   テキスト: "${multiTestText}"`);
    
    const result = await pipeline.generateFullVideo(multiTestText, {
      multipleVoicePatterns: true,
      voicePatternCount: 2,
      subtitlePreset: 'nanj-excited',
      cleanupTemp: false,
      keepIntermediateFiles: true
    });

    if (result.success) {
      console.log(`   ✅ 成功 (${result.processingTime}ms)`);
      console.log(`   📁 音声ファイル: ${result.outputs.audioFiles.length}個`);
      console.log(`   📝 字幕ファイル: ${result.outputs.subtitleFiles.length}個`);
      console.log(`   🎥 動画ファイル: ${result.outputs.videoFiles.length}個`);
      
      result.outputs.videoFiles.forEach((file, index) => {
        console.log(`   📹 出力${index + 1}: ${path.basename(file)}`);
      });

      testResults.push({
        testName: '複数パターン動画生成',
        success: true,
        duration: Date.now() - multiTestStart,
        outputs: result.outputs.videoFiles
      });
    } else {
      throw new Error(result.error || '複数パターン動画生成に失敗');
    }
  } catch (error) {
    console.log(`   ❌ 失敗: ${error}`);
    testResults.push({
      testName: '複数パターン動画生成',
      success: false,
      duration: Date.now() - multiTestStart,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // 6. バッチ処理テスト（小規模）
  console.log('\n6. バッチ処理テスト...');
  const batchTestStart = Date.now();
  const batchTexts = [
    'ストライク！',
    'ボール！',
    'アウト！'
  ];

  try {
    console.log(`   ${batchTexts.length}件のテキストを処理中...`);
    
    let completedCount = 0;
    const results = await pipeline.generateBatchVideos(batchTexts, {
      concurrency: 2,
      cleanupTemp: false,
      keepIntermediateFiles: true,
      onProgress: (completed, total) => {
        if (completed > completedCount) {
          completedCount = completed;
          console.log(`     進捗: ${completed}/${total} 完了`);
        }
      }
    });

    const successCount = results.filter(r => r.success).length;
    const totalOutputs = results.reduce((sum, r) => sum + r.outputs.videoFiles.length, 0);
    
    console.log(`   ✅ 成功: ${successCount}/${batchTexts.length} (${Date.now() - batchTestStart}ms)`);
    console.log(`   📹 総出力ファイル数: ${totalOutputs}個`);

    testResults.push({
      testName: 'バッチ処理',
      success: successCount > 0,
      duration: Date.now() - batchTestStart,
      outputs: results.flatMap(r => r.outputs.videoFiles)
    });
  } catch (error) {
    console.log(`   ❌ 失敗: ${error}`);
    testResults.push({
      testName: 'バッチ処理',
      success: false,
      duration: Date.now() - batchTestStart,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // 7. テスト結果サマリー
  console.log('\n🎉 テスト完了！');
  console.log('================================================');
  
  const totalTests = testResults.length;
  const successfulTests = testResults.filter(r => r.success).length;
  const totalTime = testResults.reduce((sum, r) => sum + r.duration, 0);
  const totalOutputs = testResults.reduce((sum, r) => sum + (r.outputs?.length || 0), 0);

  console.log(`📊 テスト結果: ${successfulTests}/${totalTests} 成功`);
  console.log(`⏱️ 総処理時間: ${(totalTime / 1000).toFixed(2)}秒`);
  console.log(`📹 総生成ファイル: ${totalOutputs}個`);

  console.log('\n📋 詳細結果:');
  testResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const duration = `${(result.duration / 1000).toFixed(2)}s`;
    console.log(`   ${index + 1}. ${status} ${result.testName} (${duration})`);
    
    if (result.outputs && result.outputs.length > 0) {
      console.log(`      出力: ${result.outputs.map(f => path.basename(f)).join(', ')}`);
    }
    
    if (result.error) {
      console.log(`      エラー: ${result.error}`);
    }
  });

  // 8. 生成ファイルの場所を表示
  console.log('\n📁 生成されたファイルの場所:');
  console.log(`   ${path.join(process.cwd(), 'output', 'test')}`);

  // 9. 次のステップの案内
  console.log('\n🚀 次のステップ:');
  if (successfulTests === totalTests) {
    console.log('   ✨ すべてのテストが成功しました！');
    console.log('   📖 詳細な使用方法: documents/voice-automation-usage.md');
    console.log('   🎬 本格的な動画生成を開始できます');
  } else {
    console.log('   ⚠️ 一部のテストが失敗しました');
    console.log('   🔧 エラーを確認して環境を調整してください');
    console.log('   📖 トラブルシューティング: documents/voice-automation-usage.md');
  }

  // パイプライン終了処理
  await pipeline.shutdownFull();

  console.log('\nテスト完了 🎬');
  process.exit(successfulTests === totalTests ? 0 : 1);
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// 実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
  });
}