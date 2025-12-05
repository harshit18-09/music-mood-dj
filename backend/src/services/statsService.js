const { PrismaClient } = require('@prisma/client');
const redisClient = require('../utils/redisClient');

const prisma = new PrismaClient();
const CACHE_TTL = 300; 
const CACHE_KEY = 'top_tracks:v1';

class StatsService {
  async getTopTracks(limit = 10) {
    try {
      const cached = await redisClient.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }

      const topTracks = await prisma.track.findMany({
        select: {
          id: true,
          title: true,
          artist: true,
          duration: true,
          playCount: true,
          format: true,
          createdAt: true
        },
        orderBy: {
          playCount: 'desc'
        },
        take: limit
      });

      await redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(topTracks));

      return topTracks;
    } catch (error) {
      console.error('Error getting top tracks:', error);
      throw error;
    }
  }

  async clearCache() {
    await redisClient.del(CACHE_KEY);
  }
}

module.exports = new StatsService();