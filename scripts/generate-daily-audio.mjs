#!/usr/bin/env node

/**
 * 指定日付の実際のプロ野球情報に基づく60個の音声ファイル生成
 * 任意の日付対応版：今日/昨日/特定日付を指定可能
 */

import * as fs from 'fs';
import * as path from 'path';

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  let targetDate = new Date(); // デフォルトは今日
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
        // 特定の日付 (YYYY-MM-DD形式)
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

// ヘルプ表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🎬 なんJ野球動画自動生成システム - 日次音声生成');
  console.log('');
  console.log('使用方法:');
  console.log('  node scripts/generate-daily-audio.mjs [オプション]');
  console.log('');
  console.log('オプション:');
  console.log('  --date=today      今日の日付で実行 (デフォルト)');
  console.log('  --date=yesterday  昨日の日付で実行');
  console.log('  --date=YYYY-MM-DD 特定の日付で実行');
  console.log('  --help, -h        このヘルプを表示');
  console.log('');
  console.log('例:');
  console.log('  node scripts/generate-daily-audio.mjs');
  console.log('  node scripts/generate-daily-audio.mjs --date=yesterday');
  console.log('  node scripts/generate-daily-audio.mjs --date=2025-09-10');
  process.exit(0);
}

// メイン処理
async function generateDailyAudio() {
  const { targetDate, dateString } = parseArgs();
  const formattedDate = formatDate(targetDate);
  
  console.log('🎤 指定日付のなんJ語コメント60個音声ファイル生成開始！');
  console.log('===========================================================');
  console.log(`📅 対象日付: ${formattedDate} (${dateString})`);
  console.log('');
  
  // 注意：この例では汎用的なコメントをサンプルとして使用
  // 実際の運用では、指定日付の情報を取得してコメントを生成する
  console.log('⚠️  現在は汎用的なサンプルコメントを使用');
  console.log('    実際の運用では指定日付の情報を自動取得・コメント生成します');
  console.log('');
  
  // 汎用的なサンプルコメント（実際には指定日付の情報から生成）
  const sampleNanjComments = [
    // 【議題1】メイン試合の展開・結果 (20個)
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

    // 【議題2】注目選手・投手の活躍 (20個)
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

    // 【議題3】特筆すべき場面・記録 (20個)
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

  // 音声パターン定義（6パターンをローテーション）
  const voicePatterns = [
    { id: 2, name: 'zundamon-normal' },
    { id: 3, name: 'zundamon-amaama' },
    { id: 6, name: 'zundamon-tsuntsun' },
    { id: 7, name: 'zundamon-sexy' },
    { id: 0, name: 'metan-normal' },
    { id: 1, name: 'metan-amaama' }
  ];

  try {
    // 出力ディレクトリ作成
    const outputDir = path.join(process.cwd(), 'audio', `nanj-${formattedDate}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    console.log(`📁 出力先: ${outputDir}`);

    // VoiceVox接続確認
    const versionResponse = await fetch('http://localhost:50021/version');
    const version = await versionResponse.text();
    console.log(`✅ VoiceVox v${version} 接続確認`);
    console.log('');

    let totalGenerated = 0;
    let successCount = 0;
    const startTime = Date.now();

    // 60個のコメントで音声生成
    for (let i = 0; i < sampleNanjComments.length; i++) {
      const comment = sampleNanjComments[i];
      const voicePattern = voicePatterns[i % voicePatterns.length];
      
      // 議題番号計算
      const topicNum = Math.floor(i / 20) + 1;
      const commentNum = (i % 20) + 1;
      
      console.log(`🎤 ${i + 1}/60 [議題${topicNum}-${commentNum}]: "${comment.substring(0, 40)}${comment.length > 40 ? '...' : ''}"`);
      console.log(`   音声パターン: ${voicePattern.name} (ID: ${voicePattern.id})`);
      
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
            
            // ファイル名生成（議題番号_コメント番号_音声パターン_日付）
            const filename = `topic${topicNum}_comment${commentNum}_${voicePattern.name}_${formattedDate.replace(/-/g, '')}.wav`;
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
        
        totalGenerated++;
        
      } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
      }
      
      // 進捗表示
      if ((i + 1) % 10 === 0) {
        const elapsed = Date.now() - startTime;
        const avgTime = elapsed / (i + 1);
        const remainingTime = Math.round(avgTime * (60 - i - 1) / 1000);
        console.log(`   📈 進捗: ${i + 1}/60 完了 (成功率: ${Math.round(successCount/(i+1)*100)}%, 残り約${remainingTime}秒)`);
        console.log('');
      }
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log('🎉 60個の音声ファイル生成完了！');
    console.log('=============================================');
    console.log(`📊 最終結果:`);
    console.log(`   対象日付: ${formattedDate} (${dateString})`);
    console.log(`   総処理数: ${totalGenerated}/60個`);
    console.log(`   成功生成数: ${successCount}個`);
    console.log(`   成功率: ${Math.round((successCount/totalGenerated)*100)}%`);
    console.log(`   総処理時間: ${Math.round(totalTime/1000)}秒`);
    console.log(`   平均処理時間: ${Math.round(totalTime/totalGenerated)}ms/個`);
    console.log(`   保存先: ${outputDir}`);
    
    // 生成されたファイル一覧（最初の10個のみ表示）
    if (successCount > 0) {
      console.log('');
      console.log('📁 生成されたファイル（最初の10個）:');
      const files = fs.readdirSync(outputDir);
      files.slice(0, 10).forEach((file, index) => {
        const stats = fs.statSync(path.join(outputDir, file));
        console.log(`   ${index + 1}. ${file} (${Math.round(stats.size/1024)}KB)`);
      });
      if (files.length > 10) {
        console.log(`   ... 他${files.length - 10}個のファイル`);
      }
    }
    
    console.log('');
    console.log('🚀 使用方法:');
    console.log('   # 今日の日付で実行');
    console.log('   node scripts/generate-daily-audio.mjs');
    console.log('');
    console.log('   # 昨日の日付で実行');
    console.log('   node scripts/generate-daily-audio.mjs --date=yesterday');
    console.log('');
    console.log('   # 特定日付で実行');
    console.log('   node scripts/generate-daily-audio.mjs --date=2025-09-10');
    
  } catch (error) {
    console.error('❌ 音声生成エラー:', error.message);
    console.log('');
    console.log('🔧 対処方法:');
    console.log('  - VoiceVoxアプリケーションが起動しているか確認');
    console.log('  - http://localhost:50021 がアクセス可能か確認');
    console.log('  - 十分なディスク容量があるか確認');
  }
}

generateDailyAudio();