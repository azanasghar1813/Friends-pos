import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import { checkHealth, claimDeviceId } from '../controllers/healthController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/', checkHealth);
router.post('/device-id', authenticate, claimDeviceId);

// Public route to download SSL Certificate for Android/iOS CA installation
router.get('/cert', (req, res) => {
  const certPath = path.join(config.paths.certs || path.join(config.paths.root, 'certs'), 'server.cert');
  if (fs.existsSync(certPath)) {
    res.setHeader('Content-Type', 'application/x-x509-ca-cert');
    res.setHeader('Content-Disposition', 'attachment; filename="friends-pos-ca.crt"');
    return res.sendFile(certPath);
  }
  return res.status(404).json({ error: 'Certificate not generated yet' });
});

export default router;
