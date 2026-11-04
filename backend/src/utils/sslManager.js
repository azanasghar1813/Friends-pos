import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import config from '../config/index.js';

/**
 * Discovers all active IPv4 addresses on the host machine.
 */
export const getLocalIPs = () => {
  const interfaces = os.networkInterfaces();
  const ips = ['127.0.0.1', 'localhost'];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return [...new Set(ips)];
};

/**
 * Fallback certificate generator using local OpenSSL (e.g. Git OpenSSL)
 */
const generateWithOpenSSL = (certFile, keyFile, localIPs) => {
  const opensslCandidates = [
    'openssl',
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe'
  ];

  let opensslBin = null;
  for (const bin of opensslCandidates) {
    try {
      if (bin.includes('\\')) {
        if (fs.existsSync(bin)) {
          opensslBin = bin;
          break;
        }
      } else {
        execFileSync(bin, ['version'], { stdio: 'ignore' });
        opensslBin = bin;
        break;
      }
    } catch (_) {}
  }

  if (!opensslBin) return false;

  try {
    const sanList = ['DNS:localhost', 'IP:127.0.0.1'];
    for (const ip of localIPs) {
      if (ip !== '127.0.0.1' && ip !== 'localhost') {
        sanList.push(`IP:${ip}`);
        sanList.push(`DNS:${ip}`);
      }
    }

    execFileSync(opensslBin, [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256',
      '-subj', '/CN=Friends POS Local Hub/O=Friends POS',
      '-keyout', keyFile,
      '-out', certFile,
      '-days', '3650',
      '-addext', `subjectAltName=${sanList.join(',')}`
    ], { stdio: 'pipe' });

    return fs.existsSync(certFile) && fs.existsSync(keyFile);
  } catch (err) {
    console.warn('[SSL] OpenSSL fallback generation failed:', err.message);
    return false;
  }
};

/**
 * Returns existing SSL credentials or generates a 10-year self-signed certificate
 * with SAN entries covering localhost and all LAN IP addresses.
 * Fully resilient: NEVER throws an uncaught error that could crash the POS backend.
 */
export const getOrCreateSSLCredentials = async () => {
  try {
    const certsDir = config?.paths?.certs || path.join(config?.paths?.root || '.', 'certs');
    const certFile = path.join(certsDir, 'server.cert');
    const keyFile = path.join(certsDir, 'server.key');

    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }

    // 1. Check if valid certs already exist on disk
    if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
      try {
        const cert = fs.readFileSync(certFile, 'utf8');
        const key = fs.readFileSync(keyFile, 'utf8');
        if (cert.length > 50 && key.length > 50) {
          return { cert, key, certFile, keyFile };
        }
      } catch (e) {
        console.warn('[SSL] Could not read existing certs, regenerating...', e.message);
      }
    }

    const localIPs = getLocalIPs();

    // 2. Try generating via 'selfsigned' package dynamically
    try {
      const selfsignedModule = await import('selfsigned').catch(() => null);
      const selfsigned = selfsignedModule?.default || selfsignedModule;
      if (selfsigned && typeof selfsigned.generate === 'function') {
        console.log('[SSL] Generating local SSL certificate for secure HTTPS access...');
        const altNames = [{ type: 2, value: 'localhost' }];
        for (const ip of localIPs) {
          if (ip !== 'localhost') {
            altNames.push({ type: 7, ip });
            altNames.push({ type: 2, value: ip });
          }
        }

        const attrs = [
          { name: 'commonName', value: "Friend's POS Local Hub" },
          { name: 'organizationName', value: "Friend's POS" },
          { name: 'countryName', value: 'PK' }
        ];

        const pems = await selfsigned.generate(attrs, {
          days: 3650,
          algorithm: 'sha256',
          keySize: 2048,
          extensions: [{ name: 'subjectAltName', altNames }]
        });

        if (pems?.cert && pems?.private) {
          fs.writeFileSync(certFile, pems.cert, 'utf8');
          fs.writeFileSync(keyFile, pems.private, 'utf8');
          console.log(`[SSL] Successfully generated SSL certificate in: ${certsDir}`);
          return { cert: pems.cert, key: pems.private, certFile, keyFile };
        }
      }
    } catch (selfsignedErr) {
      console.warn('[SSL] selfsigned generator warning:', selfsignedErr.message);
    }

    // 3. Try generating via OpenSSL fallback
    console.log('[SSL] Trying OpenSSL fallback...');
    const ok = generateWithOpenSSL(certFile, keyFile, localIPs);
    if (ok) {
      const cert = fs.readFileSync(certFile, 'utf8');
      const key = fs.readFileSync(keyFile, 'utf8');
      console.log(`[SSL] OpenSSL generated SSL certificate successfully in: ${certsDir}`);
      return { cert, key, certFile, keyFile };
    }

    console.warn('[SSL] Both selfsigned and OpenSSL were unavailable. HTTPS listener skipped.');
    return null;
  } catch (fatalErr) {
    console.warn('[SSL] getOrCreateSSLCredentials safe recovery:', fatalErr.message);
    return null;
  }
};
