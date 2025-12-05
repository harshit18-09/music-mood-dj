const { PrismaClient } = require('@prisma/client');
const { generatePlaylistFromMood } = require('../utils/openaiService');
const trackService = require('./trackService');

const prisma = new PrismaClient();

class PlaylistService {
  async generatePlaylist(moodPrompt, trackCount = 5) {
    try {
      const tracks = await trackService.getAvailableTracks();
      
      if (tracks.length === 0) {
        throw new Error('No tracks available. Please upload some music first.');
      }

      if (tracks.length < trackCount) {
        trackCount = tracks.length;
      }

      const playlistTracks = await generatePlaylistFromMood(moodPrompt, tracks, trackCount);

      if (playlistTracks.length === 0) {
        throw new Error('Could not generate a playlist for the given mood');
      }

      const playlist = await prisma.playlist.create({
        data: {
          moodPrompt: moodPrompt,
          tracks: {
            create: playlistTracks.map(pt => ({
              trackId: pt.trackId,
              weight: pt.weight,
              order: pt.order
            }))
          }
        },
        include: {
          tracks: {
            include: {
              track: true
            },
            orderBy: {
              order: 'asc'
            }
          }
        }
      });

      for (const pt of playlistTracks) {
        await trackService.incrementPlayCount(pt.trackId);
      }

      return playlist;
    } catch (error) {
      console.error('Error generating playlist:', error);
      throw error;
    }
  }

  async getAllPlaylists() {
    return await prisma.playlist.findMany({
      include: {
        tracks: {
          include: {
            track: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getPlaylistById(id) {
    return await prisma.playlist.findUnique({
      where: { id },
      include: {
        tracks: {
          include: {
            track: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
  }
}

module.exports = new PlaylistService();