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
        number: 1,
        style: "excited"
    },
    {
        topic: "守護神のセーブ失敗",
        comment: "守護神がまさかのセーブ失敗で大荒れや",
        number: 2,
        style: "angry"
    },
    {
        topic: "新人選手の活躍",
        comment: "新人くんが決勝ホームラン打ってくれた！",
        number: 3,
        style: "excited"
    }
];

async function generateSingleVideo(videoInfo) {
    const outputDir = path.join(__dirname, 'output', 'final-three-videos');

    // 出力ディレクトリを作成
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const safeTopic = videoInfo.topic.replace(/の|から|選手/g, '').substring(0, 8);
    const filename = `video_${videoInfo.number}_${safeTopic}`;
    const outputPath = path.join(outputDir, `${filename}.mp4`);

    console.log(`ビデオ ${videoInfo.number}: ${videoInfo.topic} を生成中...`);

    // VoiceVoxで音声生成
    const audioPath = path.join(outputDir, `${filename}.wav`);

    // 1. まず音声を生成
    const voicevoxSuccess = await generateVoiceVoxAudio(videoInfo.comment, audioPath);
    if (!voicevoxSuccess) {
        console.log(`NG ビデオ ${videoInfo.number}: 音声生成失敗`);
        return false;
    }

    // 2. 字幕画像を生成
    const subtitlePath = path.join(outputDir, `${filename}_subtitle.png`);
    const subtitleSuccess = await generateSubtitle(videoInfo.comment, subtitlePath, videoInfo.style);
    if (!subtitleSuccess) {
        console.log(`NG ビデオ ${videoInfo.number}: 字幕生成失敗`);
        return false;
    }

    // 3. 設定JSONを作成してビデオを生成
    const config = {
        text: videoInfo.comment,
        audio_file: audioPath,
        subtitle_image: subtitlePath,
        output_path: outputPath,
        style: videoInfo.style || "default"
    };

    return new Promise((resolve) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, 'python', 'video_composer.py'),
            JSON.stringify(config)
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
                console.log(`OK ビデオ ${videoInfo.number} 生成成功: ${path.basename(outputPath)}`);
                resolve(true);
            } else {
                console.log(`NG ビデオ ${videoInfo.number} 生成失敗 (code: ${code})`);
                if (stdout) console.log('stdout:', stdout);
                if (stderr) console.log('stderr:', stderr);
                resolve(false);
            }
        });

        pythonProcess.on('error', (error) => {
            console.log(`NG ビデオ ${videoInfo.number} エラー:`, error.message);
            resolve(false);
        });
    });
}

async function generateVoiceVoxAudio(text, outputPath) {
    return new Promise((resolve) => {
        const curlProcess = spawn('curl', [
            '-s',
            '-X', 'POST',
            'http://127.0.0.1:50021/audio_query?text=' + encodeURIComponent(text) + '&speaker=3',
            '-H', 'Content-Type: application/json'
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let queryData = '';

        curlProcess.stdout.on('data', (data) => {
            queryData += data.toString();
        });

        curlProcess.on('close', (code) => {
            if (code !== 0) {
                resolve(false);
                return;
            }

            // 音声合成
            const audioProcess = spawn('curl', [
                '-s',
                '-X', 'POST',
                'http://127.0.0.1:50021/synthesis?speaker=3',
                '-H', 'Content-Type: application/json',
                '-d', queryData,
                '--output', outputPath
            ]);

            audioProcess.on('close', (audioCode) => {
                resolve(audioCode === 0);
            });
        });
    });
}

async function generateSubtitle(text, outputPath, style) {
    return new Promise((resolve) => {
        const nodeProcess = spawn('node', [
            path.join(__dirname, 'scripts', 'generate-subtitles-skia-canvas.mjs'),
            text,
            outputPath,
            style || 'nanjDefault'
        ], {
            cwd: __dirname
        });

        nodeProcess.on('close', (code) => {
            resolve(code === 0);
        });
    });
}

async function main() {
    console.log('=== 最終3つのビデオ生成開始 ===');

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

    // 成功したビデオの一覧を表示
    const finalDir = path.join(__dirname, 'output', 'final-three-videos');
    if (fs.existsSync(finalDir)) {
        const files = fs.readdirSync(finalDir).filter(f => f.endsWith('.mp4'));
        console.log('\n生成されたビデオ:');
        files.forEach(file => console.log(`  ${file}`));
    }
}

main().catch(console.error);