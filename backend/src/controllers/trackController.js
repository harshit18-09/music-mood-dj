const trackService = require('../services/trackService');
const fs = require('fs');
const path = require('path');

class TrackController {
  async uploadTrack(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const track = await trackService.uploadTrack(req.file, req.file.originalname);
      
      res.status(201).json({
        message: 'Track uploaded successfully',
        track
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to upload track',
        message: error.message 
      });
    }
  }

  async getAllTracks(req, res) {
    try {
      const tracks = await trackService.getAllTracks();
      
      const formattedTracks = tracks.map(track => ({
        ...track,
        filePath: `/api/play/${track.id}`, 
        fileUrl: `/uploads/${track.filename}`
      }));

      res.json(formattedTracks);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch tracks',
        message: error.message 
      });
    }
  }

  async streamTrack(req, res) {
    try {
      const { trackId } = req.params;
      const track = await trackService.getTrackById(trackId);

      if (!track) {
        return res.status(404).json({ error: 'Track not found' });
      }

      if (!fs.existsSync(track.filePath)) {
        return res.status(404).json({ error: 'Audio file not found' });
      }

      await trackService.incrementPlayCount(trackId);

      const stat = fs.statSync(track.filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        const file = fs.createReadStream(track.filePath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mpeg'
        });

        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mpeg'
        });
        
        fs.createReadStream(track.filePath).pipe(res);
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to stream track',
        message: error.message 
      });
    }
  }
}

module.exports = new TrackController();