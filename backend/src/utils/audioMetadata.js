const fs = require('fs');
const path = require('path');
const mm = require('music-metadata'); // Smaller alternative

async function getAudioMetadata(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Use music-metadata instead of ffmpeg
    const metadata = await mm.parseFile(filePath);
    const stats = fs.statSync(filePath);
    
    const title = metadata.common.title || 
                  path.basename(filePath, path.extname(filePath));
    const artist = metadata.common.artist || 'Unknown Artist';
    const duration = Math.round(metadata.format.duration) || 0;
    const format = metadata.format.container || 
                   path.extname(filePath).replace('.', '').toUpperCase();
    const fileSize = stats.size;

    return {
      title,
      artist,
      duration,
      format,
      fileSize
    };
  } catch (error) {
    console.error('Error reading metadata:', error);
    
    // Fallback: Use filename if metadata extraction fails
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    
    return {
      title: fileName,
      artist: 'Unknown Artist',
      duration: 180, // Default 3 minutes
      format: path.extname(filePath).replace('.', '').toUpperCase(),
      fileSize: stats.size
    };
  }
}

module.exports = { getAudioMetadata };