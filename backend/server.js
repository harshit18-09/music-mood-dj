const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');
require('dotenv').config();

// Initialize app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3 and WAV files are allowed.'));
    }
  }
});

// In-memory database (for demo if MongoDB fails)
let demoData = {
  tracks: [],
  playlists: [],
  nextTrackId: 1,
  nextPlaylistId: 1
};

// MongoDB setup
let Track, Playlist;
try {
  const mongoose = require('mongoose');
  const db = require('./src/services/database');
  db.connect();
  
  Track = require('./src/models/Track');
  Playlist = require('./src/models/Playlist');
  console.log('✅ Using MongoDB');
} catch (error) {
  console.log('⚠️ Using in-memory database for demo');
}

// Redis setup
let redisClient;
try {
  const redis = require('./src/utils/redisClient');
  redisClient = redis;
  console.log('✅ Redis connected');
} catch (error) {
  console.log('⚠️ Using in-memory cache');
  redisClient = {
    get: async () => null,
    set: async () => 'OK',
    setex: async () => 'OK',
    del: async () => 0
  };
}

// LLM Service
const llmService = require('./src/utils/llmService');

// ============ API ENDPOINTS ============

// 1. Upload track
app.post('/api/tracks/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract metadata
    const metadata = await mm.parseFile(req.file.path);
    const duration = Math.floor(metadata.format.duration || 0);

    const trackData = {
      title: req.body.title || req.file.originalname.replace(/\.[^/.]+$/, ""),
      artist: req.body.artist || metadata.common.artist || 'Unknown',
      album: req.body.album || metadata.common.album || '',
      genre: req.body.genre || (metadata.common.genre && metadata.common.genre[0]) || 'Unknown',
      year: req.body.year || metadata.common.year,
      duration: duration,
      bpm: metadata.common.bpm,
      filePath: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      userId: req.body.userId || 'demo-user'
    };

    // Save to database
    let savedTrack;
    if (Track) {
      savedTrack = await Track.create(trackData);
    } else {
      // Demo mode
      savedTrack = {
        ...trackData,
        _id: demoData.nextTrackId++,
        usageCount: 0,
        createdAt: new Date()
      };
      demoData.tracks.push(savedTrack);
    }

    // Clear cache
    await redisClient.del('top_tracks');

    res.json({
      success: true,
      message: 'Track uploaded successfully',
      track: savedTrack
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload track', details: error.message });
  }
});

// 2. List tracks
app.get('/api/tracks', async (req, res) => {
  try {
    let tracks;
    if (Track) {
      tracks = await Track.find({ status: 'ACTIVE' }).sort({ createdAt: -1 });
    } else {
      tracks = demoData.tracks.filter(t => t.status !== 'DELETED');
    }

    res.json({
      success: true,
      tracks: tracks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Generate playlist from mood
app.post('/api/playlists/generate', async (req, res) => {
  try {
    const { mood, trackCount = 5 } = req.body;

    if (!mood) {
      return res.status(400).json({ error: 'Mood is required' });
    }

    // Get all tracks
    let allTracks;
    if (Track) {
      allTracks = await Track.find({ status: 'ACTIVE' });
    } else {
      allTracks = demoData.tracks.filter(t => t.status !== 'DELETED');
    }

    if (allTracks.length < 3) {
      return res.status(400).json({ error: 'Need at least 3 tracks' });
    }

    // Generate playlist using LLM
    const llmResult = await llmService.generatePlaylist(allTracks, mood, trackCount);

    // Create playlist in database
    let playlist;
    if (Playlist) {
      playlist = await Playlist.create({
        name: `${mood} Mix`,
        mood: mood,
        description: llmResult.reasoning || 'Generated by AI',
        items: llmResult.tracks
      });

      // Update usage counts
      for (const item of llmResult.tracks) {
        await Track.findByIdAndUpdate(item.trackId, { $inc: { usageCount: 1 } });
      }
    } else {
      // Demo mode
      playlist = {
        _id: demoData.nextPlaylistId++,
        name: `${mood} Mix`,
        mood: mood,
        description: llmResult.reasoning,
        items: llmResult.tracks,
        createdAt: new Date()
      };
      demoData.playlists.push(playlist);

      // Update usage counts in demo data
      for (const item of llmResult.tracks) {
        const track = demoData.tracks.find(t => t._id == item.trackId);
        if (track) track.usageCount = (track.usageCount || 0) + 1;
      }
    }

    // Clear cache
    await redisClient.del('top_tracks');

    res.json({
      success: true,
      playlist: {
        id: playlist._id,
        name: playlist.name,
        mood: playlist.mood,
        tracks: llmResult.tracks,
        description: playlist.description
      }
    });

  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Get playlist by ID
app.get('/api/playlists/:id', async (req, res) => {
  try {
    let playlist;
    if (Playlist) {
      playlist = await Playlist.findById(req.params.id).populate('items.trackId');
    } else {
      playlist = demoData.playlists.find(p => p._id == req.params.id);
      if (playlist) {
        playlist.items = playlist.items.map(item => ({
          ...item,
          trackId: demoData.tracks.find(t => t._id == item.trackId)
        }));
      }
    }

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({
      success: true,
      playlist: playlist
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get top tracks (WITH CACHING)
app.get('/api/stats/top-tracks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cacheKey = `top_tracks_${limit}`;

    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log('📦 Serving from cache');
      return res.json({
        success: true,
        cached: true,
        tracks: JSON.parse(cached)
      });
    }

    console.log('🔄 Fetching from database');
    let topTracks;
    
    if (Track) {
      topTracks = await Track.find({ status: 'ACTIVE' })
        .sort({ usageCount: -1 })
        .limit(limit);
    } else {
      topTracks = demoData.tracks
        .filter(t => t.status !== 'DELETED')
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, limit);
    }

    // Cache for 5 minutes
    await redisClient.setex(cacheKey, 300, JSON.stringify(topTracks));

    res.json({
      success: true,
      cached: false,
      tracks: topTracks
    });

  } catch (error) {
    console.error('Top tracks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Health endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Simple health check
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'running',
        uploads: fs.existsSync(uploadDir) ? 'ready' : 'error'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ============ FRONTEND SERVING ============

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all route for frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎵 Music Mood DJ Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});