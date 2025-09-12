#!/usr/bin/env node
/**
 * タイトル生成テスト
 */

import * as fs from 'fs';

// 日付フォーマット関数
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// サイトのタイトルをなんJ語風に改変
function enhanceTitle(originalTitle) {
    const prefixes = ['【朗報】', '【悲報】', '【速報】', '【実況】', '【神回】', '【衝撃】'];
    const suffixes = ['wwwwww', 'キターーー！！', 'やばすぎる', 'これは草', '神采配や', 'ファッ！？'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${originalTitle}${suffix}`;
}

// 既存のJSONファイルからタイトルを取得
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
        
        console.log(`🔍 選択されたトピック: "${selectedTopic}"`);
        return enhanceTitle(selectedTopic);
        
    } catch (error) {
        console.error(`❌ 分析結果読み込みエラー: ${error.message}`);
        return generateFallbackTitle(theme);
    }
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

// テスト実行
const theme = "劇的な逆転勝利";
const analysisResultPath = "./output/nanj-sites-2025-09-11/nanj-analysis-result.json";

console.log(`📋 テーマ: ${theme}`);
console.log(`📂 分析結果ファイル: ${analysisResultPath}`);

const titleText = getTitleFromAnalysisResult(theme, analysisResultPath);
console.log(`🎯 生成されたタイトル: "${titleText}"`);