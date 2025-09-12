#!/usr/bin/env node
/**
 * VoiceVox APIテストスクリプト
 */

import fs from 'fs';
import path from 'path';

const VOICEVOX_API_BASE = 'http://localhost:50021';

async function testVoiceVoxAPI() {
    try {
        console.log('VoiceVox API接続テスト開始...');
        
        // 1. まず簡単なテキストでテスト
        const testText = "テスト音声です";
        console.log(`テストテキスト: "${testText}"`);
        
        // 2. Query APIでaudio_queryを生成 (POSTメソッド使用)
        const queryUrl = `${VOICEVOX_API_BASE}/audio_query?text=${encodeURIComponent(testText)}&speaker=3`;
        console.log(`Query URL: ${queryUrl}`);
        
        const queryResponse = await fetch(queryUrl, {
            method: 'POST'
        });
        
        console.log(`Query Response Status: ${queryResponse.status}`);
        console.log(`Query Response Headers:`, Object.fromEntries(queryResponse.headers));
        
        if (!queryResponse.ok) {
            throw new Error(`Query API failed: ${queryResponse.status} ${queryResponse.statusText}`);
        }
        
        const audioQuery = await queryResponse.json();
        console.log('✓ Audio Query生成成功');
        console.log('Audio Query keys:', Object.keys(audioQuery));
        
        // 3. Synthesis APIで音声合成
        const synthResponse = await fetch(`${VOICEVOX_API_BASE}/synthesis?speaker=3`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(audioQuery)
        });
        
        console.log(`Synthesis Response Status: ${synthResponse.status}`);
        
        if (!synthResponse.ok) {
            throw new Error(`Synthesis API failed: ${synthResponse.status} ${synthResponse.statusText}`);
        }
        
        // 4. 音声データを保存
        const audioBuffer = await synthResponse.arrayBuffer();
        const testFilePath = './audio/nanj-2025-09-12/test_voicevox.wav';
        fs.writeFileSync(testFilePath, Buffer.from(audioBuffer));
        
        console.log(`✓ テスト音声生成成功: ${testFilePath}`);
        console.log(`ファイルサイズ: ${(audioBuffer.byteLength / 1024).toFixed(1)}KB`);
        
        return true;
        
    } catch (error) {
        console.error('VoiceVox APIテストエラー:', error);
        return false;
    }
}

// メイン実行
testVoiceVoxAPI().then(success => {
    if (success) {
        console.log('\n✓ VoiceVox API正常動作確認');
    } else {
        console.log('\n✗ VoiceVox API問題あり');
    }
});