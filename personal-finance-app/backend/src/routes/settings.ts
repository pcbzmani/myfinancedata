import { Router, Request, Response } from 'express';
import { getScriptUrl, setScriptUrl, ping } from '../sheets';

const router = Router();

// Only accept valid Google Apps Script deployment URLs
const APPS_SCRIPT_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

router.get('/', (_req: Request, res: Response) => {
  const url = getScriptUrl();
  res.json({ configured: !!url, scriptUrl: url ? `${url.slice(0, 40)}...` : '' });
});

router.put('/', async (req: Request, res: Response) => {
  const { scriptUrl } = req.body;
  if (!scriptUrl) return res.status(400).json({ error: 'scriptUrl required' });

  if (typeof scriptUrl !== 'string' || !APPS_SCRIPT_PATTERN.test(scriptUrl.trim())) {
    return res.status(400).json({ error: 'Invalid URL. Must be a Google Apps Script deployment URL (https://script.google.com/macros/s/.../exec).' });
  }

  setScriptUrl(scriptUrl.trim());
  res.json({ message: 'Saved' });
});

router.get('/test', async (_req: Request, res: Response) => {
  const ok = await ping();
  res.json({ ok });
});

export default router;
