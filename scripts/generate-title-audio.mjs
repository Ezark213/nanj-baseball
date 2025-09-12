#!/usr/bin/env node
/**
 * なんJ語風キャッチータイトル音声生成スクリプト
 */

import * as fs from 'fs';
import * as path from 'path';

// 日付フォーマット関数
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// VoiceVox設定
const VOICEVOX_BASE_URL = 'http://127.0.0.1:50021';
const DEFAULT_SPEAKER_ID = 1; // zundamon-normal

// なんJ語風キャッチータイトル生成
function getTitleFromAnalysisResult(theme, analysisResultPath) {
    try {
        if (!fs.existsSync(analysisResultPath)) {
            console.log(`⚠️  分析結果ファイルが見つかりません: ${analysisResultPath}`);
            return generateFallbackTitle(theme);
        }
        
        const analysisData = JSON.parse(fs.readFileSync(analysisResultPath, 'utf8'));
        const allTopics = [];
        
        // 全サイトのトピックを収集
        for (const site of analysisData.sites) {
            allTopics.push(...site.topics);
        }
        
        if (allTopics.length === 0) {
            return generateFallbackTitle(theme);
        }
        
        // テーマに関連するトピックを検索
        const themeKeywords = {
            "劇的な逆転勝利": ["逆転", "サヨナラ", "劇的", "2死", "9回"],
            "守護神のセーブ失敗": ["失敗", "炎上", "やらかし", "クローザー", "守護神"],
            "新人選手の活躍": ["新人", "ルーキー", "初", "活躍", "決勝弾"]
        };
        
        const keywords = themeKeywords[theme] || [];
        let selectedTopic = null;
        
        // キーワードにマッチするトピックを探す
        for (const topic of allTopics) {
            for (const keyword of keywords) {
                if (topic.includes(keyword)) {
                    selectedTopic = topic;
                    break;
                }
            }
            if (selectedTopic) break;
        }
        
        // マッチしない場合はランダム選択
        if (!selectedTopic) {
            selectedTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
        }
        
        return enhanceTitle(selectedTopic);
        
    } catch (error) {
        console.error(`❌ 分析結果読み込みエラー: ${error.message}`);
        return generateFallbackTitle(theme);
    }
}

// サイトのタイトルをなんJ語風に改変
function enhanceTitle(originalTitle) {
    const prefixes = ['【朗報】', '【悲報】', '【速報】', '【実況】', '【神回】', '【衝撃】'];
    const suffixes = ['wwwwww', 'キターーー！！', 'やばすぎる', 'これは草', '神采配や', 'ファッ！？'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${originalTitle}${suffix}`;
}

// フォールバックタイトル生成  
function generateFallbackTitle(theme) {
    const fallbackTitles = {
        "劇的な逆転勝利": "【神回】9回2死からの大逆転劇wwwww",
        "守護神のセーブ失敗": "【悲報】エースがまさかの大炎上",
        "新人選手の活躍": "【朗報】ルーキーが決勝弾キターー！！"
    };
    
    return fallbackTitles[theme] || "【実況】今日のプロ野球ハイライトwwww";
}

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
        const audioBuffer = await synthResponse.buffer();
        fs.writeFileSync(outputPath, audioBuffer);
        
        console.log(`✅ タイトル音声生成完了: ${outputPath}`);
        return outputPath;
        
    } catch (error) {
        console.error(`❌ タイトル音声生成エラー: ${error.message}`);
        throw error;
    }
}

// メイン処理
async function main() {
    try {
        const args = process.argv.slice(2);
        
        if (args.length < 2) {
            console.log('使用方法: node generate-title-audio.mjs <テーマ名> <出力ディレクトリ>');
            console.log('例: node generate-title-audio.mjs "劇的な逆転勝利" "./audio/nanj-2025-09-12"');
            process.exit(1);
        }
        
        const theme = args[0];
        const outputDir = args[1];
        
        // 出力ディレクトリを作成
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // キャッチータイトル生成
        // 分析結果ファイルパスを推測
        const today = formatDate(new Date());
        const analysisResultPath = `./output/nanj-sites-${today}/nanj-analysis-result.json`;
        
        // サイトタイトルからキャッチータイトル生成
        const titleText = getTitleFromAnalysisResult(theme, analysisResultPath);
        console.log(`📝 生成されたタイトル: "${titleText}"`);
        
        // ファイル名生成（現在の日付を使用）
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `title_${theme.replace(/[^a-zA-Z0-9]/g, '')}_zundamon-normal_${dateStr}.wav`;
        const outputPath = path.join(outputDir, filename);
        
        // VoiceVoxで音声生成
        await generateTitleAudio(titleText, outputPath);
        
        // 結果をJSONで出力（テストスクリプト用）
        const result = {
            theme: theme,
            title_text: titleText,
            title_audio_file: outputPath,
            generated_at: new Date().toISOString()
        };
        
        console.log('\n📊 生成結果:');
        console.log(JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error(`❌ メイン処理エラー: ${error.message}`);
        process.exit(1);
    }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}