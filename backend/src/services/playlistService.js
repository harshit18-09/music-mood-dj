const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redisClient = require('../utils/redisClient');
const llmService = require('../utils/llmService');

class PlaylistService {
  async generatePlaylist(mood, trackCount = 5, userId = null) {
    try {
      const tracks = await prisma.track.findMany({
        where: { 
          status: 'ACTIVE',
          ...(userId && { userId })
        },
        select: {
          id: true,
          title: true,
          artist: true,
          genre: true,
          duration: true,
          bpm: true,
          filePath: true
        }
      });

      if (tracks.length < 3) {
        throw new Error('Need at least 3 tracks to generate a playlist');
      }

      const llmResult = await llmService.generatePlaylist(
        tracks,
        mood,
        Math.min(trackCount, tracks.length)
      );

      const playlist = await prisma.playlist.create({
        data: {
          name: `${mood} Mix`,
          mood,
          description: llmResult.reasoning,
          userId
        }
      });

      const playlistItems = [];
      for (const item of llmResult.tracks) {
        const track = await prisma.track.findUnique({
          where: { id: item.trackId }
        });

        if (track) {
          const playlistItem = await prisma.playlistItem.create({
            data: {
              playlistId: playlist.id,
              trackId: track.id,
              weight: item.weight,
              order: item.order
            }
          });

          await prisma.track.update({
            where: { id: track.id },
            data: { usageCount: { increment: 1 } }
          });

          playlistItems.push(playlistItem);
          
          await redisClient.del('top_tracks');
        }
      }

      return {
        playlistId: playlist.id,
        mood,
        tracks: llmResult.tracks,
        reasoning: llmResult.reasoning
      };

    } catch (error) {
      console.error('Playlist generation error:', error);
      throw error;
    }
  }

  async getPlaylist(playlistId) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        items: {
          include: {
            track: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    return playlist;
  }

  async getTopTracks(limit = 10) {
    const cacheKey = `top_tracks_${limit}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const topTracks = await prisma.track.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { usageCount: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        artist: true,
        genre: true,
        usageCount: true,
        duration: true
      }
    });

    await redisClient.setex(cacheKey, 300, JSON.stringify(topTracks));
    
    return topTracks;
  }
}

module.exports = new PlaylistService();