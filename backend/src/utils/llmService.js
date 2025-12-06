require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

class LLMService {
  constructor() {
    try {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      console.log('✅ Gemini AI initialized');
    } catch (error) {
      console.log('⚠️ Using demo LLM (set GEMINI_API_KEY for real AI)');
    }
  }

  async generatePlaylist(tracks, mood, count = 5) {
    // If no API key or demo mode, return mock playlist
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'demo') {
      return this.getMockPlaylist(tracks, count);
    }

    try {
      const trackList = tracks.map(track => 
        `ID: ${track._id}, Title: "${track.title}", Artist: "${track.artist || 'Unknown'}", Genre: "${track.genre || 'Unknown'}"`
      ).join('\n');

      const prompt = `Select ${count} tracks for mood: "${mood}"\n\nAvailable tracks:\n${trackList}\n\nReturn JSON: {"tracks": [{"trackId": "id", "weight": 0.9, "order": 1}]}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return this.getMockPlaylist(tracks, count);
    } catch (error) {
      console.error('LLM error:', error.message);
      return this.getMockPlaylist(tracks, count);
    }
  }

  getMockPlaylist(tracks, count) {
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, tracks.length));
    
    return {
      tracks: selected.map((track, index) => ({
        trackId: track._id.toString(),
        weight: parseFloat((0.5 + Math.random() * 0.5).toFixed(2)),
        order: index + 1
      })),
      reasoning: "Demo playlist (set GEMINI_API_KEY for AI-generated)"
    };
  }
}

module.exports = new LLMService();