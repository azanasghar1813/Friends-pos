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
    this.isPermanent = false;
    this.token = null;
    this.customDomain = null;
    this._loadConfig();
  }

  _getConfigPath() {
    const candidates = [
      path.resolve(process.cwd(), 'tunnel_config.json'),
      path.resolve(__dirname, '../../../tunnel_config.json'),
      path.resolve(__dirname, '../../tunnel_config.json')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  }

  _loadConfig() {
    this.token = process.env.CLOUDFLARE_TUNNEL_TOKEN || null;
    this.customDomain = process.env.CLOUDFLARE_CUSTOM_DOMAIN || null;

    try {
      const candidates = [
        path.resolve(process.cwd(), 'tunnel_config.json'),
        path.resolve(__dirname, '../../../tunnel_config.json'),
        path.resolve(__dirname, '../../tunnel_config.json')
      ];
      for (const cfgPath of candidates) {
        if (fs.existsSync(cfgPath)) {
          const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
          if (raw.token) this.token = raw.token.trim();
          if (raw.customDomain) this.customDomain = raw.customDomain.trim();
          break;
        }
      }
    } catch (e) {
      console.warn('[TunnelService] Failed reading tunnel_config.json:', e.message);
    }

    if (this.token) {
      this.isPermanent = true;
      const domain = this.customDomain || 'https://friends.corevex.tech';
      this.url = domain.startsWith('http') ? domain : `https://${domain}`;
    }
  }

  saveConfig(token, customDomain) {
    this.token = token ? token.trim() : null;
    this.customDomain = customDomain ? customDomain.trim() : null;

    try {
      const cfgPath = this._getConfigPath();
      fs.writeFileSync(cfgPath, JSON.stringify({
        token: this.token || '',
        customDomain: this.customDomain || ''
      }, null, 2), 'utf8');
      console.log('[TunnelService] Saved tunnel configuration successfully.');
    } catch (e) {
      console.error('[TunnelService] Failed saving tunnel configuration:', e.message);
    }

    this.stop();
    setTimeout(() => this.start(5000), 500);
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
    this._loadConfig();

    const bin = this._resolveBinary();
    if (!bin) {
      this.status = 'ERROR';
      this.errorMessage = 'cloudflared binary not found on system';
      console.warn('[TunnelService] ⚠️ cloudflared.exe not found. Cloudflare Tunnel is disabled.');
      return;
    }

    this.status = 'CONNECTING';

    try {
      let args = [];
      if (this.token) {
        this.isPermanent = true;
        args = ['tunnel', 'run', '--token', this.token];
        console.log(`[TunnelService] 🌐 Starting Permanent Cloudflare Tunnel with Token...`);
      } else {
        this.isPermanent = false;
        args = ['tunnel', '--url', `http://127.0.0.1:${port}`];
        console.log(`[TunnelService] 🌐 Starting Quick Cloudflare Tunnel pointing to http://127.0.0.1:${port}...`);
      }

      this.process = spawn(bin, args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

      const handleOutput = (chunk) => {
        const text = chunk.toString();

        if (this.isPermanent) {
          // For permanent token mode, watch for connection confirmation
          const isConnected = text.includes('Registered tunnel connection') 
            || text.includes('Connection') 
            || text.includes('active')
            || text.includes('Updated to new configuration');

          if (isConnected && this.status !== 'CONNECTED') {
            const domain = this.customDomain || 'https://friends.corevex.tech';
            this.url = domain.startsWith('http') ? domain : `https://${domain}`;
            this.status = 'CONNECTED';
            this.errorMessage = null;
            console.log(`\n======================================================`);
            console.log(`🚀 [Cloudflare Permanent Tunnel Live]`);
            console.log(`🔗 Permanent Fixed URL : ${this.url}`);
            console.log(`======================================================\n`);
            this._broadcastStatus();
          }
        } else {
          // Quick tunnel mode, extract trycloudflare URL
          const match = text.match(urlRegex);
          if (match && this.url !== match[0]) {
            this.url = match[0];
            this.status = 'CONNECTED';
            this.errorMessage = null;
            console.log(`\n======================================================`);
            console.log(`🚀 [Cloudflare Quick Tunnel Live]`);
            console.log(`🔗 Waiter & Mobile PWA URL : ${this.url}`);
            console.log(`======================================================\n`);
            this._broadcastStatus();
          }
        }
      };

      this.process.stderr.on('data', handleOutput);
      this.process.stdout.on('data', handleOutput);

      this.process.on('error', (err) => {
        console.warn('[TunnelService] Process error:', err.message);
        this.status = 'ERROR';
        this.errorMessage = err.message;
        this._broadcastStatus();
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
        this._broadcastStatus();
      });

      // In permanent token mode, if process hasn't exited within 2.5s, assume connected
      if (this.isPermanent) {
        setTimeout(() => {
          if (this.process && this.status !== 'CONNECTED' && !this.errorMessage) {
            const domain = this.customDomain || 'https://friends.corevex.tech';
            this.url = domain.startsWith('http') ? domain : `https://${domain}`;
            this.status = 'CONNECTED';
            console.log(`[TunnelService] Permanent tunnel active at: ${this.url}`);
            this._broadcastStatus();
          }
        }, 2500);
      }
    } catch (e) {
      this.status = 'ERROR';
      this.errorMessage = e.message;
      console.warn('[TunnelService] Failed to start tunnel:', e.message);
    }
  }

  _broadcastStatus() {
    import('./socketService.js').then(({ socketService }) => {
      if (socketService?.io) {
        socketService.io.emit('tunnel:status', this.getStatus());
      }
    }).catch(() => {});
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
    const configuredUrl = this.customDomain 
      ? (this.customDomain.startsWith('http') ? this.customDomain : `https://${this.customDomain}`)
      : (this.token ? 'https://friends.corevex.tech' : null);

    return {
      status: (this.status === 'DISCONNECTED' && this.token) ? 'CONNECTED' : this.status,
      url: this.url || configuredUrl,
      lanIp: lanIps[0] || '127.0.0.1',
      allLanIps: lanIps,
      port: 5000,
      isPermanent: this.isPermanent || !!this.token,
      tokenConfigured: !!this.token,
      customDomain: this.customDomain || (this.token ? 'https://friends.corevex.tech' : null),
      errorMessage: this.errorMessage
    };
  }
}

export const tunnelService = new TunnelService();
