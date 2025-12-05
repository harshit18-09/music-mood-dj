const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { getAudioMetadata } = require('../utils/audioMetadata');

const prisma = new PrismaClient();

class TrackService {
  async uploadTrack(file, originalName) {
    try {
      const metadata = await getAudioMetadata(file.path);
      
      const track = await prisma.track.create({
        data: {
          filename: file.filename,
          originalName: originalName,
          title: metadata.title,
          artist: metadata.artist,
          duration: metadata.duration,
          filePath: file.path,
          fileSize: metadata.fileSize,
          format: metadata.format,
          playCount: 0
        }
      });

      return track;
    } catch (error) {
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  async getAllTracks() {
    return await prisma.track.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getTrackById(id) {
    return await prisma.track.findUnique({
      where: { id }
    });
  }

  async incrementPlayCount(trackId) {
    return await prisma.track.update({
      where: { id: trackId },
      data: {
        playCount: {
          increment: 1
        }
      }
    });
  }

  async getAvailableTracks() {
    return await prisma.track.findMany({
      select: {
        id: true,
        title: true,
        artist: true,
        duration: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}

module.exports = new TrackService();