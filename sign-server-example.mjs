#!/usr/bin/env node

/**
 * TikTok Live Sign Server — kendi imzalama sunucu
 *
 * Bu script basit bir TikTok Live WebSocket sign server'ıdır.
 * EulerStream veya 3. parti servislere bağımlı değil — kendi backend'in.
 *
 * Kurulum:
 * 1. npm install express
 * 2. node sign-server-example.mjs
 * 3. Environment variable: TIKTOK_SIGN_SERVER_URL=http://localhost:3001/sign
 *
 * Not: Bu örnek server için production'da proper error handling ve rate limiting ekle.
 */

import express from 'express';
import https from 'https';
import { URL } from 'url';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// TikTok'un sign endpoint'ine istek at (official TikTok API)
async function signTikTokWebsocket(roomUrl, sessionId = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(roomUrl);
    const hostname = urlObj.hostname.replace('www.', '');

    const options = {
      hostname: 'www.tiktok.com',
      path: `/live/${hostname}/room/`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          // TikTok HTML'i parse et ve WebSocket URL'i çıkar
          const wsMatch = data.match(/wss?:\/\/[^"'\\s]+/);
          if (wsMatch) {
            resolve({
              url: wsMatch[0],
              cursor: '',
            });
          } else {
            reject(new Error('WebSocket URL not found in page'));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Sign endpoint
app.post('/sign', async (req, res) => {
  try {
    const { roomUrl, sessionId } = req.body;

    if (!roomUrl) {
      return res.status(400).json({ error: 'roomUrl is required' });
    }

    console.log(`[Sign Server] Signing: ${roomUrl}`);

    const result = await signTikTokWebsocket(roomUrl, sessionId);

    res.json({
      url: result.url,
      cursor: result.cursor || '',
    });

    console.log(`[Sign Server] ✓ Signed successfully`);
  } catch (err) {
    console.error('[Sign Server] Error:', err.message);
    res.status(500).json({
      error: 'Failed to sign WebSocket URL',
      message: err.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tiktok-sign-server' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 TikTok Sign Server running on http://localhost:${PORT}`);
  console.log(`📡 Sign endpoint: http://localhost:${PORT}/sign`);
  console.log(`\n⚙️  Environment variable to set:`);
  console.log(`   TIKTOK_SIGN_SERVER_URL=http://localhost:${PORT}/sign\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Sign Server] Shutting down...');
  process.exit(0);
});
