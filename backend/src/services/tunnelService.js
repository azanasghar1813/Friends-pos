import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getLocalIPs } from '../utils/sslManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TunnelService {
  constructor() {
    this.process = null;
    this.url = null;
    this.status = 'DISCONNECTED'; // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'
    this.errorMessage = null;
    this.restartTimer = null;
    this.explicitlyStopped = false;
  }

  _resolveBinary() {
    const candidates = [
      path.resolve(__dirname, '../../bin/cloudflared.exe'),
      path.resolve(__dirname, '../bin/cloudflared.exe'),
      path.resolve(process.cwd(), 'bin/cloudflared.exe'),
      process.resourcesPath ? path.join(process.resourcesPath, 'bin/cloudflared.exe') : null,
      process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked/bin/cloudflared.exe') : null
    ].filter(Boolean);

    for (const binPath of candidates) {
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    }
    return null;
  }

  start(port = 5000) {
    if (this.process) return;
    this.explicitlyStopped = false;

    const bin = this._resolveBinary();
    if (!bin) {
      this.status = 'ERROR';
      this.errorMessage = 'cloudflared binary not found on system';
      console.warn('[TunnelService] ⚠️ cloudflared.exe not found. Cloudflare Tunnel is disabled.');
      return;
    }

    this.status = 'CONNECTING';
    console.log(`[TunnelService] 🌐 Starting Cloudflare Tunnel pointing to http://127.0.0.1:${port}...`);

    try {
      this.process = spawn(bin, ['tunnel', '--url', `http://127.0.0.1:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

      const handleOutput = (chunk) => {
        const text = chunk.toString();
        const match = text.match(urlRegex);
        if (match && this.url !== match[0]) {
          this.url = match[0];
          this.status = 'CONNECTED';
          this.errorMessage = null;
          console.log(`\n======================================================`);
          console.log(`🚀 [Cloudflare Tunnel Live]`);
          console.log(`🔗 Waiter & Mobile PWA URL : ${this.url}`);
          console.log(`======================================================\n`);

          // Broadcast to connected clients / frontend via socket
          import('./socketService.js').then(({ socketService }) => {
            if (socketService?.io) {
              socketService.io.emit('tunnel:status', this.getStatus());
            }
          }).catch(() => {});
        }
      };

      this.process.stderr.on('data', handleOutput);
      this.process.stdout.on('data', handleOutput);

      this.process.on('error', (err) => {
        console.warn('[TunnelService] Process error:', err.message);
        this.status = 'ERROR';
        this.errorMessage = err.message;
      });

      this.process.on('close', (code) => {
        this.process = null;
        if (!this.explicitlyStopped) {
          console.warn(`[TunnelService] Process exited (code ${code}). Attempting reconnect in 10s...`);
          this.status = 'CONNECTING';
          this.restartTimer = setTimeout(() => this.start(port), 10000);
        } else {
          this.status = 'DISCONNECTED';
          this.url = null;
        }
      });
    } catch (e) {
      this.status = 'ERROR';
      this.errorMessage = e.message;
      console.warn('[TunnelService] Failed to start tunnel:', e.message);
    }
  }

  stop() {
    this.explicitlyStopped = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.process) {
      try {
        this.process.kill();
      } catch (_) {}
      this.process = null;
    }
    this.status = 'DISCONNECTED';
    this.url = null;
  }

  getStatus() {
    const lanIps = getLocalIPs().filter(ip => ip !== '127.0.0.1' && ip !== 'localhost');
    return {
      status: this.status,
      url: this.url,
      lanIp: lanIps[0] || '127.0.0.1',
      allLanIps: lanIps,
      port: 5000,
      errorMessage: this.errorMessage
    };
  }
}

export const tunnelService = new TunnelService();
