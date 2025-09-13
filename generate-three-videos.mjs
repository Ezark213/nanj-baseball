#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3つのトピック用のビデオ生成
const videosToGenerate = [
    {
        topic: "劇的な逆転勝利",
        comment: "あー今9回2死でダメかと思ったわ、やりやがった",
        number: 1
    },
    {
        topic: "守護神のセーブ失敗",
        comment: "守護神がまさかのセーブ失敗で大荒れや",
        number: 2
    },
    {
        topic: "新人選手の活躍",
        comment: "新人くんが決勝ホームラン打ってくれた！",
        number: 3
    }
];

async function generateSingleVideo(videoInfo) {
    const outputDir = path.join(__dirname, 'output', 'three-videos');

    // 出力ディレクトリを作成
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const safeTopic = videoInfo.topic.replace(/の|から|選手/g, '').substring(0, 10);
    const outputPath = path.join(outputDir, `video_${videoInfo.number.toString().padStart(3, '0')}_${safeTopic}.mp4`);

    console.log(`ビデオ ${videoInfo.number}: ${videoInfo.topic} を生成中...`);

    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, 'python', 'video_composer.py'),
            videoInfo.comment,
            outputPath
        ], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`OK ビデオ ${videoInfo.number} 生成成功`);
                resolve(true);
            } else {
                console.log(`NG ビデオ ${videoInfo.number} 生成失敗 (code: ${code})`);
                console.log('stdout:', stdout);
                console.log('stderr:', stderr);
                resolve(false);
            }
        });

        pythonProcess.on('error', (error) => {
            console.log(`NG ビデオ ${videoInfo.number} エラー:`, error.message);
            resolve(false);
        });
    });
}

async function main() {
    console.log('=== 3つのビデオ生成開始 ===');

    let successCount = 0;

    for (const videoInfo of videosToGenerate) {
        const success = await generateSingleVideo(videoInfo);
        if (success) {
            successCount++;
        }
    }

    console.log('\n=== 生成完了 ===');
    console.log(`成功: ${successCount}/3`);
    console.log(`成功率: ${(successCount/3*100).toFixed(1)}%`);
}

main().catch(console.error);