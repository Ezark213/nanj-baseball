#!/usr/bin/env node

/**
 * skia-canvasで生成された字幕画像を使用して字幕付き動画を生成するスクリプト
 * nanj-baseball プロジェクト - AI コーディング原則 第1～4条準拠
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

class VideoWithSubtitlesGenerator {
    constructor() {
        this.subtitleDir = path.join(rootDir, 'subtitles');
        this.audioDir = path.join(rootDir, 'audio');
        this.outputDir = path.join(rootDir, 'output', 'videos-with-subtitles');
        this.pythonScript = path.join(rootDir, 'python', 'video_composer.py');
        
        this.ensureDirectories();
    }

    ensureDirectories() {
        [this.subtitleDir, this.audioDir, this.outputDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 ディレクトリを作成: ${dir}`);
            }
        });
    }

    /**
     * 指定された日付の字幕画像と音声ファイルをペアリング
     */
    findSubtitleAudioPairs(targetDate) {
        console.log(`🔍 ${targetDate} の字幕・音声ペアを検索中...`);
        
        // skia-canvas字幕ディレクトリから画像を取得
        const skiaSubtitleDir = path.join(this.subtitleDir, `nanj-${targetDate}-skia`);
        if (!fs.existsSync(skiaSubtitleDir)) {
            throw new Error(`skia字幕ディレクトリが見つかりません: ${skiaSubtitleDir}`);
        }

        // 音声ディレクトリから音声ファイルを取得  
        const audioDateDir = path.join(this.audioDir, `nanj-${targetDate}`);
        if (!fs.existsSync(audioDateDir)) {
            throw new Error(`音声ディレクトリが見つかりません: ${audioDateDir}`);
        }

        const subtitleFiles = fs.readdirSync(skiaSubtitleDir)
            .filter(file => file.endsWith('.png'))
            .sort();

        const audioFiles = fs.readdirSync(audioDateDir)
            .filter(file => file.endsWith('.wav'))
            .sort();

        console.log(`📊 字幕画像: ${subtitleFiles.length}個, 音声: ${audioFiles.length}個`);

        const pairs = [];
        const maxFiles = Math.min(subtitleFiles.length, audioFiles.length);

        for (let i = 0; i < maxFiles; i++) {
            pairs.push({
                subtitleImage: path.join(skiaSubtitleDir, subtitleFiles[i]),
                audioFile: path.join(audioDateDir, audioFiles[i]),
                text: this.extractTextFromFilename(subtitleFiles[i])
            });
        }

        console.log(`✅ ${pairs.length}個のペアを作成`);
        return pairs;
    }

    /**
     * ファイル名からテキスト内容を抽出
     */
    extractTextFromFilename(filename) {
        // ファイル名パターン: index_style_text.png
        const withoutExt = filename.replace('.png', '');
        const parts = withoutExt.split('_');
        
        if (parts.length >= 3) {
            // index と style を除いた部分がテキスト
            const textParts = parts.slice(2);
            return textParts.join('_');
        }
        
        return withoutExt; // フォールバック
    }

    /**
     * 単一の字幕付き動画を生成
     */
    async generateSingleVideo(config) {
        return new Promise((resolve, reject) => {
            const configJson = JSON.stringify(config);
            const python = process.platform === 'win32' ? 'python' : 'python3';
            
            const child = spawn(python, [this.pythonScript, configJson], {
                cwd: rootDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ 動画生成完了: ${path.basename(config.output_path)}`);
                    resolve(stdout);
                } else {
                    console.error(`❌ 動画生成失敗: ${path.basename(config.output_path)}`);
                    console.error(`Python stdout: ${stdout}`);
                    console.error(`Python stderr: ${stderr}`);
                    reject(new Error(`Python exit code: ${code}`));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * バッチで字幕付き動画を生成
     */
    async generateVideosWithSubtitles(targetDate) {
        try {
            console.log(`🎬 ${targetDate} の字幕付き動画生成開始`);

            const pairs = this.findSubtitleAudioPairs(targetDate);
            console.log(`📊 発見したペア数: ${pairs.length}`);
            
            if (pairs.length === 0) {
                throw new Error('生成可能なペアが見つかりません');
            }

            // 出力ディレクトリの作成
            const dateOutputDir = path.join(this.outputDir, `nanj-${targetDate}`);
            if (!fs.existsSync(dateOutputDir)) {
                fs.mkdirSync(dateOutputDir, { recursive: true });
            }

            const results = [];
            let successCount = 0;

            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                const outputFilename = `video_${String(i + 1).padStart(3, '0')}_${pair.text.substring(0, 20)}.mp4`;
                const outputPath = path.join(dateOutputDir, outputFilename);

                const config = {
                    text: pair.text,
                    audio_file: pair.audioFile,
                    subtitle_image: pair.subtitleImage,
                    output_path: outputPath,
                    settings: {
                        video: {
                            fps: 30,
                            resolution: [1920, 1080],
                            codec: 'libx264',
                            bitrate: '5000k'
                        },
                        subtitle: {
                            position: 'bottom',
                            margin: 80,
                            fade_duration: 0.2
                        },
                        background: {
                            loop: true,
                            volume: 0.05
                        }
                    }
                };

                try {
                    console.log(`🎯 [${i + 1}/${pairs.length}] 生成中: ${path.basename(outputPath)}`);
                    await this.generateSingleVideo(config);
                    results.push(outputPath);
                    successCount++;
                } catch (error) {
                    console.error(`❌ [${i + 1}/${pairs.length}] 失敗:`, error.message);
                    results.push(null);
                }

                // プログレス表示
                const progress = Math.round((i + 1) / pairs.length * 100);
                console.log(`📈 進捗: ${progress}% (${i + 1}/${pairs.length})`);
            }

            console.log(`\n✅ 字幕付き動画生成完了!`);
            console.log(`📊 成功: ${successCount}/${pairs.length}`);
            console.log(`📁 出力先: ${dateOutputDir}`);

            // 結果サマリーをJSONで保存
            const summary = {
                date: targetDate,
                timestamp: new Date().toISOString(),
                total: pairs.length,
                success: successCount,
                failed: pairs.length - successCount,
                outputDirectory: dateOutputDir,
                results: results.map((result, index) => ({
                    index: index + 1,
                    status: result ? 'success' : 'failed',
                    outputPath: result,
                    subtitleImage: pairs[index].subtitleImage,
                    audioFile: pairs[index].audioFile,
                    text: pairs[index].text
                }))
            };

            const summaryPath = path.join(dateOutputDir, 'generation-summary.json');
            fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
            console.log(`📄 サマリー保存: ${summaryPath}`);

            return summary;

        } catch (error) {
            console.error('❌ 字幕付き動画生成エラー:', error);
            console.error('エラー詳細:', error.stack);
            throw error;
        }
    }

    /**
     * 動画情報を表示
     */
    async displayVideoInfo(videoPath) {
        try {
            const stats = fs.statSync(videoPath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            console.log(`📹 ${path.basename(videoPath)}`);
            console.log(`   サイズ: ${fileSizeMB}MB`);
            console.log(`   パス: ${videoPath}`);
            
            return {
                path: videoPath,
                sizeBytes: stats.size,
                sizeMB: parseFloat(fileSizeMB)
            };
        } catch (error) {
            console.error(`動画情報取得エラー: ${videoPath}`, error);
            return null;
        }
    }
}

// メイン実行
async function main() {
    try {
        console.log('🎬 字幕付き動画生成システム - nanj-baseball');
        console.log('=' .repeat(50));

        // コマンドライン引数処理
        const args = process.argv.slice(2);
        let targetDate = null;

        // --date引数の解析
        const dateIndex = args.findIndex(arg => arg.startsWith('--date='));
        if (dateIndex !== -1) {
            targetDate = args[dateIndex].split('=')[1];
        }

        // デフォルト日付（昨日）
        if (!targetDate) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            targetDate = yesterday.toISOString().split('T')[0];
        }

        console.log(`📅 対象日付: ${targetDate}`);

        const generator = new VideoWithSubtitlesGenerator();
        const summary = await generator.generateVideosWithSubtitles(targetDate);

        if (summary.success > 0) {
            console.log('\n🎉 字幕付き動画生成成功! 次の手順:');
            console.log(`1. 出力ディレクトリを確認: ${summary.outputDirectory}`);
            console.log(`2. 生成された ${summary.success} 個の動画をチェック`);
            console.log('3. 必要に応じて動画を編集・配布');
            
            // 最初の数個の動画情報を表示
            const successResults = summary.results.filter(r => r.status === 'success');
            console.log('\n📹 生成された動画（最初の3個）:');
            
            if (successResults.length === 0) {
                console.log('⚠️ 成功した動画がありません');
                return summary;
            }
            
            for (let i = 0; i < Math.min(3, successResults.length); i++) {
                const result = successResults[i];
                await generator.displayVideoInfo(result.outputPath);
            }
        } else {
            console.error('❌ すべての動画生成が失敗しました');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ システムエラー:', error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { VideoWithSubtitlesGenerator };