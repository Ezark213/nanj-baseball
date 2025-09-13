#!/usr/bin/env node

/**
 * 単一の字幕付き動画生成テストスクリプト
 * nanj-baseball プロジェクト - AI コーディング原則 第1～4条準拠
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

async function testSingleVideo() {
    try {
        console.log('🧪 単一字幕付き動画生成テスト');
        console.log('=' .repeat(40));

        const subtitleDir = path.join(rootDir, 'subtitles', 'nanj-2025-09-12-skia');
        const audioDir = path.join(rootDir, 'audio', 'nanj-2025-09-12');
        const outputDir = path.join(rootDir, 'output', 'test-videos');

        // 出力ディレクトリ作成
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // テスト用ファイルを選択
        const testSubtitle = path.join(subtitleDir, 'theme1_comment1_zundamon-normal_20250912_subtitle.png');
        const testAudio = path.join(audioDir, 'theme1_comment1_zundamon-normal_20250912.wav');
        const outputPath = path.join(outputDir, 'test_subtitle_video.mp4');

        // ファイル存在確認
        if (!fs.existsSync(testSubtitle)) {
            throw new Error(`字幕ファイルが存在しません: ${testSubtitle}`);
        }
        if (!fs.existsSync(testAudio)) {
            throw new Error(`音声ファイルが存在しません: ${testAudio}`);
        }

        console.log(`📁 字幕: ${path.basename(testSubtitle)}`);
        console.log(`🔊 音声: ${path.basename(testAudio)}`);
        console.log(`📹 出力: ${path.basename(outputPath)}`);

        // Python設定
        const config = {
            text: "9回2死からの劇的逆転勝利",
            audio_file: testAudio,
            subtitle_image: testSubtitle,
            output_path: outputPath,
            settings: {
                video: {
                    fps: 30,
                    resolution: [1920, 1080],
                    codec: 'libx264',
                    bitrate: '3000k'
                },
                subtitle: {
                    position: 'bottom',
                    margin: 100,
                    fade_duration: 0.3
                },
                background: {
                    loop: true,
                    volume: 0.05
                }
            }
        };

        // Python実行
        const pythonScript = path.join(rootDir, 'python', 'video_composer.py');
        const configJson = JSON.stringify(config);

        console.log('\n🐍 Python動画生成開始...');
        
        return new Promise((resolve, reject) => {
            const python = process.platform === 'win32' ? 'python' : 'python3';
            
            const child = spawn(python, [pythonScript, configJson], {
                cwd: rootDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                console.log('Python stdout:', output.trim());
            });

            child.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                console.error('Python stderr:', output.trim());
            });

            child.on('close', (code) => {
                console.log(`\n🏁 Python プロセス終了 (exit code: ${code})`);
                
                if (code === 0) {
                    if (fs.existsSync(outputPath)) {
                        const stats = fs.statSync(outputPath);
                        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                        
                        console.log('✅ 字幕付き動画生成成功!');
                        console.log(`📊 ファイルサイズ: ${fileSizeMB}MB`);
                        console.log(`📁 出力パス: ${outputPath}`);
                        
                        resolve(outputPath);
                    } else {
                        console.error('❌ 出力ファイルが作成されませんでした');
                        reject(new Error('出力ファイルが存在しません'));
                    }
                } else {
                    console.error(`❌ Python実行エラー (exit code: ${code})`);
                    console.error(`stderr: ${stderr}`);
                    reject(new Error(`Python exit code: ${code}`));
                }
            });

            child.on('error', (error) => {
                console.error('❌ Python起動エラー:', error);
                reject(error);
            });
        });

    } catch (error) {
        console.error('❌ テストエラー:', error);
        throw error;
    }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
    testSingleVideo()
        .then(outputPath => {
            console.log('\n🎉 テスト完了!');
            console.log('次のステップ:');
            console.log('1. 生成された動画を確認');
            console.log('2. 問題がなければバッチ生成を実行');
        })
        .catch(error => {
            console.error('\n💥 テスト失敗:', error);
            process.exit(1);
        });
}

export { testSingleVideo };