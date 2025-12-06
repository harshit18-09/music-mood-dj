const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: String,
  album: String,
  genre: String,
  year: Number,
  duration: { type: Number, required: true }, // in seconds
  bpm: Number,
  filePath: { type: String, required: true, unique: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  userId: String,
  usageCount: { type: Number, default: 0 },
  status: { type: String, default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Track', trackSchema);