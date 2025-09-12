#!/usr/bin/env node
/**
 * 全テーマのタイトル音声生成スクリプト
 * 
 * 3つのテーマそれぞれのタイトル音声をVoiceVoxで生成
 */

import fs from 'fs';
import path from 'path';

const VOICEVOX_API_BASE = 'http://localhost:50021';
const OUTPUT_DIR = './audio/nanj-2025-09-12';

// テーマタイトル定義
const themeData = [
    {
        num: 1,
        title: "【衝撃】9回2死からの劇的逆転勝利ファッ！？",
        filename: "title_gekiteki.wav"
    },
    {
        num: 2, 
        title: "【悲報】守護神がまさかのセーブ失敗やらかしたwwwwww",
        filename: "title_shushin_fail.wav"
    },
    {
        num: 3,
        title: "【朗報】新人選手の活躍キターーー！！これは神采配や",
        filename: "title_shinjin_katsuyaku.wav"
    }
];

async function generateTitleAudio(titleText, outputPath) {
    try {
        console.log(`タイトル音声生成中: "${titleText}"`);
        
        // 1. Query APIでaudio_queryを生成
        const queryResponse = await fetch(`${VOICEVOX_API_BASE}/audio_query?text=${encodeURIComponent(titleText)}&speaker=3`, {
            method: 'POST'
        });
        
        if (!queryResponse.ok) {
            throw new Error(`Query API failed: ${queryResponse.status}`);
        }
        
        const audioQuery = await queryResponse.json();
        
        // 2. Synthesis APIで音声合成
        const synthResponse = await fetch(`${VOICEVOX_API_BASE}/synthesis?speaker=3`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(audioQuery)
        });
        
        if (!synthResponse.ok) {
            throw new Error(`Synthesis API failed: ${synthResponse.status}`);
        }
        
        // 3. 音声データを保存
        const audioBuffer = await synthResponse.arrayBuffer();
        fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        
        console.log(`✓ 生成完了: ${outputPath}`);
        return outputPath;
        
    } catch (error) {
        console.error(`エラー: ${titleText}の音声生成に失敗:`, error);
        return null;
    }
}

async function main() {
    console.log('全テーマタイトル音声生成開始');
    
    // 出力ディレクトリ確認
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // 各テーマのタイトル音声を生成
    for (const theme of themeData) {
        const outputPath = path.join(OUTPUT_DIR, theme.filename);
        
        // 既存ファイルがあるかチェック
        if (fs.existsSync(outputPath)) {
            console.log(`スキップ: ${theme.filename} (既存)`);
            continue;
        }
        
        await generateTitleAudio(theme.title, outputPath);
        
        // API制限を考慮した間隔
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n=== 全テーマタイトル音声生成完了 ===');
    
    // 生成されたファイルを確認
    console.log('\n生成されたファイル:');
    for (const theme of themeData) {
        const filePath = path.join(OUTPUT_DIR, theme.filename);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log(`✓ ${theme.filename} (${(stats.size / 1024).toFixed(1)}KB)`);
        } else {
            console.log(`✗ ${theme.filename} (未生成)`);
        }
    }
}

main().catch(console.error);