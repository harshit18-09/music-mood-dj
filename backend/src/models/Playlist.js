const mongoose = require('mongoose');

const playlistItemSchema = new mongoose.Schema({
  trackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Track', required: true },
  weight: { type: Number, default: 1.0, min: 0.1, max: 1.0 },
  order: { type: Number, required: true }
});

const playlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mood: { type: String, required: true },
  description: String,
  userId: String,
  items: [playlistItemSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Playlist', playlistSchema);