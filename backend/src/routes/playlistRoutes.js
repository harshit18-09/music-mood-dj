const express = require('express');
const router = express.Router();
const playlistService = require('../services/playlistService');

router.post('/generate', async (req, res) => {
  try {
    const { mood, trackCount = 5 } = req.body;
    
    if (!mood || typeof mood !== 'string' || mood.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Mood description is required' 
      });
    }

    const result = await playlistService.generatePlaylist(
      mood.trim(),
      parseInt(trackCount) || 5,
      req.user?.id 
    );

    res.json({
      success: true,
      message: 'Playlist generated successfully',
      data: result
    });

  } catch (error) {
    console.error('Generate playlist error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to generate playlist'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const playlist = await playlistService.getPlaylist(req.params.id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({
      success: true,
      data: playlist
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

router.get('/stats/top-tracks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topTracks = await playlistService.getTopTracks(limit);
    
    res.json({
      success: true,
      data: topTracks
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;