require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

class LLMService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || 'DEMO_KEY';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    this.requestQueue = [];
    this.maxRequestsPerMinute = 50; 
    this.isProcessing = false;
  }


  async rateLimitedRequest(prompt) {
    return new Promise(async (resolve, reject) => {
      this.requestQueue.push({ prompt, resolve, reject });
      
      if (!this.isProcessing) {
        this.isProcessing = true;
        await this.processQueue();
      }
    });
  }

  async processQueue() {
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        const result = await this.makeRequest(request.prompt);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    this.isProcessing = false;
  }

  async makeRequest(prompt) {
    try {
      if (process.env.GEMINI_API_KEY === 'DEMO_KEY' || !process.env.GEMINI_API_KEY) {
        console.log("Using demo LLM response (set GEMINI_API_KEY for real AI)");
        return this.getDemoResponse();
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("LLM API Error:", error);
      
      return this.getDemoResponse();
    }
  }

  /**
   * Generate playlist using LLM
   * @param {Array} tracks 
   * @param {String} mood 
   * @param {Number} count 
   */
  async generatePlaylist(tracks, mood, count = 5) {
    const trackList = tracks.map((track, index) => 
      `${index + 1}. ID: ${track.id}, Title: "${track.title}", Artist: "${track.artist || 'Unknown'}", Genre: "${track.genre || 'Unknown'}", Duration: ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`
    ).join('\n');

    //THIS PROMPT IS NOT WRITTEN BY ME(Harshit Chugh) ITS AI GENERATED FOR BETTER AND MORE CONSISTENT RESULTS
    const prompt = `You are a professional music DJ creating a playlist based on mood.
    
Available Tracks:
${trackList}

Mood/Theme Requested: "${mood}"
Number of tracks needed: ${count}

IMPORTANT INSTRUCTIONS:
1. Select ${count} tracks that best match the mood "${mood}"
2. For each selected track, provide:
   - trackId: The exact ID from the list above
   - weight: A number between 0.1 and 1.0 indicating how well it matches the mood
   - order: The playback order from 1 to ${count}

REQUIRED OUTPUT FORMAT (JSON only, no other text):
{
  "playlist": [
    {"trackId": "exact-id-here", "weight": 0.95, "order": 1},
    {"trackId": "exact-id-here", "weight": 0.85, "order": 2},
    ...
  ],
  "reasoning": "Brief explanation of selection"
}

Select exactly ${count} tracks. Ensure track IDs match exactly from the list above.`;

    try {
      const response = await this.rateLimitedRequest(prompt);
      return this.parseLLMResponse(response, tracks);
    } catch (error) {
      console.error("Playlist generation failed:", error);
      return this.getFallbackPlaylist(tracks, count);
    }
  }

  parseLLMResponse(response, availableTracks) {
    try {
      let jsonString = response;
      
      if (response.includes('```json')) {
        jsonString = response.split('```json')[1].split('```')[0];
      } else if (response.includes('```')) {
        jsonString = response.split('```')[1].split('```')[0];
      }
      
      const parsed = JSON.parse(jsonString);
      
      const availableIds = availableTracks.map(t => t.id);
      const validTracks = parsed.playlist.filter(item => 
        availableIds.includes(item.trackId)
      );
      
      return {
        tracks: validTracks,
        reasoning: parsed.reasoning || "Generated based on mood analysis"
      };
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      return this.getFallbackPlaylist(availableTracks, Math.min(5, availableTracks.length));
    }
  }

  getDemoResponse() {
    return JSON.stringify({
      playlist: [
        {"trackId": "demo-1", "weight": 0.95, "order": 1},
        {"trackId": "demo-2", "weight": 0.85, "order": 2},
        {"trackId": "demo-3", "weight": 0.75, "order": 3},
        {"trackId": "demo-4", "weight": 0.80, "order": 4},
        {"trackId": "demo-5", "weight": 0.70, "order": 5}
      ],
      reasoning: "Demo playlist for testing. Set GEMINI_API_KEY for AI-generated playlists."
    });
  }

  getFallbackPlaylist(tracks, count) {
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, tracks.length));
    
    return {
      tracks: selected.map((track, index) => ({
        trackId: track.id,
        weight: parseFloat((0.5 + Math.random() * 0.5).toFixed(2)),
        order: index + 1
      })),
      reasoning: "Fallback playlist (LLM service unavailable)"
    };
  }
}

module.exports = new LLMService();