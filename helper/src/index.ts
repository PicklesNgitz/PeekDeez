import express from 'express';
import { getNowPlaying, handleTransport, getLyrics } from './helper';

const router = express.Router();

// Route for nowplaying data
router.get('/nowplaying', async (req, res) => {
  try {
    const data = await getNowPlaying();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route for transport actions
router.post('/transport', async (req, res) => {
  try {
    const { action } = req.body;
    await handleTransport(action);
    res.json({ status: 'success', action });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route for lyrics
router.get('/lyrics', async (req, res) => {
  try {
    const data = await getLyrics();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;