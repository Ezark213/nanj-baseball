#!/usr/bin/env node
/**
 * 特定のタイトルテキストで音声生成
 */

import * as fs from 'fs';

// VoiceVox設定
const VOICEVOX_BASE_URL = 'http://127.0.0.1:50021';
const DEFAULT_SPEAKER_ID = 1; // zundamon-normal

// VoiceVoxで音声生成
async function generateTitleAudio(titleText, outputPath, speakerId = DEFAULT_SPEAKER_ID) {
    try {
        console.log(`🎤 タイトル音声生成開始: "${titleText}"`);
        
        // 音声クエリ生成
        const queryResponse = await fetch(
            `${VOICEVOX_BASE_URL}/audio_query?text=${encodeURIComponent(titleText)}&speaker=${speakerId}`,
            { method: 'POST' }
        );
        
        if (!queryResponse.ok) {
            throw new Error(`音声クエリ生成失敗: ${queryResponse.status}`);
        }
        
        const audioQuery = await queryResponse.json();
        
        // 音声合成
        const synthResponse = await fetch(
            `${VOICEVOX_BASE_URL}/synthesis?speaker=${speakerId}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(audioQuery)
            }
        );
        
        if (!synthResponse.ok) {
            throw new Error(`音声合成失敗: ${synthResponse.status}`);
        }
        
        // ファイル保存
        const audioBuffer = await synthResponse.arrayBuffer();
        fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        
        console.log(`✅ タイトル音声生成完了: ${outputPath}`);
        return outputPath;
        
    } catch (error) {
        console.error(`❌ タイトル音声生成エラー: ${error.message}`);
        throw error;
    }
}

// メイン処理
async function main() {
    const titleText = "【衝撃】9回2死からの劇的逆転勝利ファッ！？";
    const outputPath = "./audio/nanj-2025-09-12/title_real_gekiteki.wav";
    
    console.log(`📝 タイトルテキスト: "${titleText}"`);
    console.log(`📁 出力パス: ${outputPath}`);
    
    await generateTitleAudio(titleText, outputPath);
    
    console.log(`🎯 完了！生成されたファイル: ${outputPath}`);
}

main().catch(console.error);