#!/usr/bin/env node

/**
 * 音声自動化システム サンプル実行ファイル
 * 
 * 使用方法:
 * 1. VoiceVoxアプリケーションを起動
 * 2. npm install && npm run build
 * 3. node examples/voice-automation-example.js
 */

import { VoiceAutomationPipeline, checkSystemHealth } from '../src/voice/index.js';
import * as path from 'path';

async function main() {
  console.log('🎤 音声自動化システム サンプル実行');
  console.log('=====================================\n');

  // 1. システム健康状態チェック
  console.log('1. システム状態確認中...');
  const isHealthy = await checkSystemHealth();
  
  if (!isHealthy) {
    console.error('❌ VoiceVoxに接続できません');
    console.log('VoiceVoxアプリケーションが起動しているか確認してください');
    console.log('URL: http://localhost:50021');
    process.exit(1);
  }
  console.log('✅ VoiceVox接続確認完了\n');

  // 2. パイプライン初期化
  console.log('2. パイプライン初期化中...');
  const pipeline = new VoiceAutomationPipeline({
    audioOutputDir: path.join(process.cwd(), 'audio', 'examples'),
    autoCleanup: {
      enabled: true,
      maxFiles: 50,
      interval: 5 * 60 * 1000 // 5分
    },
    defaultOptions: {
      speedScale: 1.0,
      pitchScale: 0.0,
      volumeScale: 1.0
    }
  });

  try {
    // 3. システム状態詳細確認
    console.log('3. システム詳細状態...');
    const status = await pipeline.getSystemStatus();
    console.log(`   VoiceVox バージョン: ${status.voicevox.version}`);
    console.log(`   利用可能スピーカー: ${status.voicevox.speakers}個`);
    console.log(`   音声パターン数: ${status.patterns.available}個`);
    console.log(`   選択モード: ${status.patterns.config}\n`);

    // 4. 利用可能なパターン表示
    console.log('4. 利用可能な音声パターン:');
    const patterns = pipeline.getPatternManager().getAvailablePatterns();
    patterns.slice(0, 8).forEach((pattern, index) => {
      console.log(`   ${index + 1}. ${pattern.character} - ${pattern.style} (ID: ${pattern.id})`);
    });
    if (patterns.length > 8) {
      console.log(`   ... 他 ${patterns.length - 8} パターン`);
    }
    console.log();

    // 5. 単一音声生成テスト
    console.log('5. 単一音声生成テスト...');
    const sampleTexts = [
      'こんにちは！ずんだもんなのだ！',
      'nanj-baseball音声システムのテストなのだ！',
      'VoiceVox連携が正常に動作しているのだ！'
    ];

    for (let i = 0; i < sampleTexts.length; i++) {
      const text = sampleTexts[i];
      console.log(`   ${i + 1}. "${text}"`);
      
      const result = await pipeline.generateSingleVoice(text);
      
      if (result.success) {
        const audioResult = result.results[0];
        console.log(`      ✅ 成功: ${audioResult.pattern.character}(${audioResult.pattern.style})`);
        console.log(`      📁 ファイル: ${path.basename(audioResult.filePath!)}`);
        console.log(`      ⏱️ 生成時間: ${result.processingTime}ms`);
      } else {
        console.log(`      ❌ 失敗: ${result.error}`);
      }
    }
    console.log();

    // 6. 複数パターン生成テスト
    console.log('6. 複数パターン生成テスト...');
    const multiText = 'ホームランなのだ！素晴らしいプレイなのだ！';
    console.log(`   テキスト: "${multiText}"`);
    
    const multiResult = await pipeline.generateMultipleVoices(multiText, 3);
    
    console.log(`   結果: ${multiResult.results.filter(r => r.success).length}/3 成功`);
    multiResult.results.forEach((result, index) => {
      if (result.success) {
        console.log(`      ${index + 1}. ✅ ${result.pattern.character}(${result.pattern.style})`);
        console.log(`         📁 ${path.basename(result.filePath!)}`);
      } else {
        console.log(`      ${index + 1}. ❌ ${result.error}`);
      }
    });
    console.log();

    // 7. 条件付き選択テスト
    console.log('7. 条件付き選択テスト...');
    const conditionalTests = [
      { text: 'おはようなのだ！', description: '朝の挨拶 → 甘い声が選ばれやすい' },
      { text: 'やったー！勝利なのだ！', description: '興奮 → ツンツン声が選ばれやすい' },
      { text: 'ホームランを打ったのだ！', description: '野球関連 → 通常・ツンツン声が選ばれやすい' }
    ];

    for (const test of conditionalTests) {
      console.log(`   "${test.text}"`);
      console.log(`   (${test.description})`);
      
      const result = await pipeline.generateSingleVoice(test.text);
      
      if (result.success) {
        const audioResult = result.results[0];
        console.log(`   → 選択: ${audioResult.pattern.character}(${audioResult.pattern.style})`);
      } else {
        console.log(`   → エラー: ${result.error}`);
      }
      console.log();
    }

    // 8. ファイル管理テスト
    console.log('8. ファイル管理状況...');
    const fileManager = pipeline.getFileManager();
    const stats = fileManager.getStatistics();
    
    console.log(`   総ファイル数: ${stats.totalFiles}`);
    console.log(`   総サイズ: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   平均サイズ: ${(stats.averageSize / 1024).toFixed(2)} KB`);
    
    if (stats.totalFiles > 0) {
      console.log('   キャラクター別:');
      Object.entries(stats.byCharacter).forEach(([char, count]) => {
        console.log(`     ${char}: ${count}ファイル`);
      });
    }
    
    // 最新ファイルを表示
    const recentFiles = fileManager.getAudioFiles({ 
      limit: 5, 
      sortBy: 'createdAt', 
      sortOrder: 'desc' 
    });
    
    if (recentFiles.length > 0) {
      console.log('   最新ファイル:');
      recentFiles.forEach((file, index) => {
        console.log(`     ${index + 1}. ${file.filename} - ${file.character}(${file.pattern})`);
      });
    }
    console.log();

    // 9. バッチ処理テスト（小規模）
    console.log('9. バッチ処理テスト...');
    const batchTexts = [
      'ストライク！',
      'ボール！',
      'アウト！'
    ];
    
    console.log(`   ${batchTexts.length}件のテキストを処理中...`);
    const batchResults = await pipeline.generateBatch(batchTexts, {
      concurrency: 2,
      generationOptions: { speedScale: 1.1 }
    });
    
    const batchSuccessCount = batchResults.filter(r => r.success).length;
    console.log(`   結果: ${batchSuccessCount}/${batchTexts.length} 成功`);
    console.log();

    // 10. 完了メッセージ
    console.log('🎉 サンプル実行完了！');
    console.log('=====================================');
    console.log();
    console.log('📁 生成された音声ファイルの場所:');
    console.log(`   ${path.join(process.cwd(), 'audio', 'examples')}`);
    console.log();
    console.log('📚 詳細な使用方法:');
    console.log('   documents/voice-automation-usage.md を参照');
    console.log();

  } catch (error) {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  } finally {
    // 必須: パイプラインのシャットダウン
    pipeline.shutdown();
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// 実行
if (require.main === module) {
  main().catch(console.error);
}