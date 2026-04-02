import { Router, Request, Response } from 'express';
import { getAuthUrl, handleCallback, disconnect, getOAuthStatus } from '../sheets-api';

const router = Router();

// Redirect to Google consent screen
router.get('/google', (_req: Request, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Google OAuth not configured on this server. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment.' });
  }
  res.redirect(getAuthUrl());
});

// OAuth callback — exchange code, store tokens, redirect to frontend
router.get('/google/callback', async (req: Request, res: Response) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') return res.status(400).send('Missing authorization code');
    await handleCallback(code);
    res.redirect(`${clientUrl}/settings?google=connected`);
  } catch (e: any) {
    console.error('OAuth callback error:', e.message);
    res.redirect(`${clientUrl}/settings?google=error`);
  }
});

// Check connection status
router.get('/status', (_req: Request, res: Response) => {
  res.json(getOAuthStatus());
});

// Disconnect Google account
router.delete('/google', async (_req: Request, res: Response) => {
  try {
    await disconnect();
    res.json({ message: 'Google account disconnected' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
