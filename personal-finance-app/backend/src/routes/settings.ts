import { Router, Request, Response } from 'express';
import { getScriptUrl, setScriptUrl, ping } from '../sheets';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const url = getScriptUrl();
  res.json({ configured: !!url, scriptUrl: url ? `${url.slice(0, 40)}...` : '' });
});

router.put('/', async (req: Request, res: Response) => {
  const { scriptUrl } = req.body;
  if (!scriptUrl) return res.status(400).json({ error: 'scriptUrl required' });
  setScriptUrl(scriptUrl);
  res.json({ message: 'Saved' });
});

router.get('/test', async (_req: Request, res: Response) => {
  const ok = await ping();
  res.json({ ok });
});

export default router;
