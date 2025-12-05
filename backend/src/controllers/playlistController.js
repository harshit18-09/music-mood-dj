const playlistService = require('../services/playlistService');

class PlaylistController {
  async generatePlaylist(req, res) {
    try {
      const { mood, trackCount = 5 } = req.body;

      if (!mood || mood.trim() === '') {
        return res.status(400).json({ error: 'Mood prompt is required' });
      }

      const playlist = await playlistService.generatePlaylist(mood.trim(), parseInt(trackCount));

      res.status(201).json({
        message: 'Playlist generated successfully',
        playlist
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to generate playlist',
        message: error.message 
      });
    }
  }

  async getAllPlaylists(req, res) {
    try {
      const playlists = await playlistService.getAllPlaylists();
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch playlists',
        message: error.message 
      });
    }
  }
}

module.exports = new PlaylistController();