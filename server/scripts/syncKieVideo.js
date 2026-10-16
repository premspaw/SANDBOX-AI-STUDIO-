#!/usr/bin/env node
/**
 * ZeroLens — Admin CLI: Sync & Import KIE/Remote Video to User Gallery
 * 
 * Usage:
 *   node server/scripts/syncKieVideo.js <user_email_or_id> <video_url> [prompt] [engine] [credits_to_deduct]
 * 
 * Examples:
 *   node server/scripts/syncKieVideo.js premspaw@gmail.com "https://tempfile.aiquickdraw.com/seedance/1791948214825-k4jdxlc26uh.mp4"
 *   node server/scripts/syncKieVideo.js user@domain.com "https://tempfile.aiquickdraw.com/..." "Cinematic shot of neon city" "Seedance 2.0 Pro" 20
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

if (fs.existsSync(path.join(projectRoot, '.env'))) {
    dotenv.config({ path: path.join(projectRoot, '.env') });
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error(`\n❌ Error: Missing required arguments.`);
    console.log(`\nUsage:`);
    console.log(`  node server/scripts/syncKieVideo.js <user_email_or_id> <video_url> [prompt] [engine] [credits_to_deduct]\n`);
    process.exit(1);
}

const [targetUserIdentifier, videoUrl, customPrompt, customEngine, customCredits] = args;
const prompt = customPrompt || 'Seedance 2.0 Cinematic Video';
const engine = customEngine || 'Seedance 2.0 Pro';
const deductCredits = Number(customCredits) || 0;

async function main() {
    console.log(`\n🚀 ZeroLens Admin: Syncing Video to User Gallery`);
    console.log(`─────────────────────────────────────────────────`);
    console.log(`Target User:    ${targetUserIdentifier}`);
    console.log(`Remote Video:   ${videoUrl}`);
    console.log(`Engine:         ${engine}`);
    console.log(`Prompt:         ${prompt}`);
    console.log(`Deduct Credits: ${deductCredits}⚡\n`);

    // 1. Initialize Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const sb = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

    let targetUserId = targetUserIdentifier;
    let targetUserEmail = targetUserIdentifier;

    if (sb && targetUserIdentifier.includes('@')) {
        console.log(`🔍 Looking up user ID for email: ${targetUserIdentifier}...`);
        try {
            const { data: prof } = await sb.from('profiles').select('id, email, shorts_balance').ilike('email', targetUserIdentifier.trim().toLowerCase()).maybeSingle();
            if (prof) {
                targetUserId = prof.id;
                targetUserEmail = prof.email;
                console.log(`✅ Found profile: ID ${targetUserId} (Balance: ${prof.shorts_balance}⚡)`);
            } else {
                const { data: authUsers } = await sb.auth.admin.listUsers();
                const match = authUsers?.users?.find(u => u.email?.toLowerCase() === targetUserIdentifier.trim().toLowerCase());
                if (match) {
                    targetUserId = match.id;
                    targetUserEmail = match.email;
                    console.log(`✅ Found auth user: ID ${targetUserId}`);
                }
            }
        } catch (e) {
            console.warn(`Notice: Supabase lookup note (${e.message}). Proceeding.`);
        }
    }

    // 2. Download the video from remote URL
    console.log(`⬇️ Downloading video from KIE / remote server...`);
    const resp = await fetch(videoUrl);
    if (!resp.ok) {
        throw new Error(`Failed to download video: HTTP ${resp.status} ${resp.statusText}`);
    }
    const arrayBuf = await resp.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuf);
    console.log(`✅ Downloaded ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB binary video.`);

    // 3. Upload to permanent Cloudflare R2 CDN
    console.log(`☁️ Uploading to permanent Cloudflare R2 CDN...`);
    let permanentUrl = videoUrl;
    try {
        const { uploadToGCS } = await import('../../services/storageService.js');
        const storageKey = `users/${targetUserId}/generated/seedance_${Date.now()}.mp4`;
        permanentUrl = await uploadToGCS(videoBuffer, storageKey, 'video/mp4');
        console.log(`✅ Permanent CDN URL: ${permanentUrl}`);
    } catch (upErr) {
        console.warn(`⚠️ R2 upload warning (${upErr.message}), falling back to direct URL.`);
    }

    // 4. Save to local_assets.json (Studio gallery fallback)
    const localAssetsPath = path.join(projectRoot, 'local_assets.json');
    if (fs.existsSync(localAssetsPath)) {
        try {
            const assets = JSON.parse(fs.readFileSync(localAssetsPath, 'utf8'));
            const newAsset = {
                id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: `${engine} Video`,
                type: 'video',
                url: permanentUrl,
                user_id: targetUserId,
                aspect: '16:9',
                aspectRatio: '16:9',
                metadata: {
                    folder: 'studio',
                    projectId: 'default',
                    project_id: 'default',
                    prompt,
                    engine
                },
                prompt,
                engine,
                created_at: new Date().toISOString()
            };
            assets.unshift(newAsset);
            // Also add for local_user so it shows up in dev/offline
            assets.unshift({ ...newAsset, id: `${newAsset.id}_local`, user_id: 'local_user' });
            fs.writeFileSync(localAssetsPath, JSON.stringify(assets.slice(0, 500), null, 2), 'utf8');
            console.log(`✅ Inserted into local_assets.json gallery`);
        } catch (lErr) {
            console.warn(`⚠️ local_assets.json update note:`, lErr.message);
        }
    }

    // 5. Insert into Supabase assets table
    if (sb && targetUserId && !targetUserId.includes('@') && targetUserId !== 'local_user') {
        try {
            console.log(`💾 Inserting asset into Supabase database...`);
            const { error: insErr } = await sb.from('assets').insert([{
                name: `${engine} Video`,
                type: 'video',
                url: permanentUrl,
                user_id: targetUserId,
                created_at: new Date().toISOString(),
                model: engine,
                metadata: {
                    aspect: '16:9',
                    folder: 'studio',
                    projectId: 'default',
                    project_id: 'default',
                    prompt,
                    engine
                }
            }]);
            if (insErr) console.warn(`Supabase asset insert note:`, insErr.message);
            else console.log(`✅ Successfully saved asset to Supabase assets table!`);
        } catch (dbErr) {
            console.warn(`Notice:`, dbErr.message);
        }
    }

    // 6. Deduct credits if requested
    if (sb && deductCredits > 0 && targetUserId && !targetUserId.includes('@')) {
        try {
            const { data: prof } = await sb.from('profiles').select('shorts_balance').eq('id', targetUserId).maybeSingle();
            if (prof) {
                const newBal = Math.max(0, (prof.shorts_balance || 0) - deductCredits);
                await sb.from('profiles').update({ shorts_balance: newBal }).eq('id', targetUserId);
                await sb.from('shorts_transactions').insert({
                    user_id: targetUserId,
                    amount: -deductCredits,
                    action_type: 'spend_video_generation',
                    reason: `Manual sync: ${engine} video (${deductCredits}⚡)`
                });
                console.log(`⚡ Deducted ${deductCredits} Shorts credits. New balance: ${newBal}⚡`);
            }
        } catch (cErr) {
            console.warn(`Credit deduction note:`, cErr.message);
        }
    }

    console.log(`\n🎉 SUCCESS! The video has been added to ${targetUserEmail}'s gallery.`);
    console.log(`Direct Permanent URL: ${permanentUrl}\n`);
}

main().catch(err => {
    console.error(`\n❌ Error:`, err.message);
    process.exit(1);
});
