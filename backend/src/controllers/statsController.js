const statsService = require('../services/statsService');

class StatsController {
  async getTopTracks(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const topTracks = await statsService.getTopTracks(limit);
      
      res.json({
        count: topTracks.length,
        tracks: topTracks
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch top tracks',
        message: error.message 
      });
    }
  }

  async clearCache(req, res) {
    try {
      await statsService.clearCache();
      res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to clear cache',
        message: error.message 
      });
    }
  }
}

module.exports = new StatsController();