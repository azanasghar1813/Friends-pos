import fs from 'fs';
import path from 'path';
import os from 'os';
import selfsigned from 'selfsigned';
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
 * Returns existing SSL credentials or generates a 10-year self-signed certificate
 * with SAN entries covering localhost and all LAN IP addresses.
 */
export const getOrCreateSSLCredentials = async () => {
  const certsDir = config.paths.certs || path.join(config.paths.root, 'certs');
  const certFile = path.join(certsDir, 'server.cert');
  const keyFile = path.join(certsDir, 'server.key');

  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

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

  console.log('[SSL] Generating local SSL certificate for secure HTTPS access...');
  const localIPs = getLocalIPs();
  const altNames = [
    { type: 2, value: 'localhost' }
  ];

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

  fs.writeFileSync(certFile, pems.cert, 'utf8');
  fs.writeFileSync(keyFile, pems.private, 'utf8');

  console.log(`[SSL] Successfully generated SSL certificate in: ${certsDir}`);
  return { cert: pems.cert, key: pems.private, certFile, keyFile };
};
