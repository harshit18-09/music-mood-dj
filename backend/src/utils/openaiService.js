const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generatePlaylistFromMood(mood, tracks, trackCount = 5) {
  try {
    const trackList = tracks.map(track => 
      `ID: ${track.id} | Title: "${track.title}" | Artist: ${track.artist} | Duration: ${track.duration}s`
    ).join('\n');

    const prompt = `You are a music DJ creating a playlist based on mood.

Available tracks:
${trackList}

Mood/Theme: "${mood}"
Number of tracks requested: ${trackCount}

Create a playlist with ${trackCount} tracks from the available list above that best match this mood.
For each track, provide:
1. The track ID (must be from the available list)
2. A weight between 0.1 and 1.0 indicating how well it fits the mood (1.0 = perfect fit)
3. The order in the playlist (1 to ${trackCount})

Return ONLY a JSON array with this exact structure:
[
  {
    "trackId": "uuid-from-list",
    "weight": 0.95,
    "order": 1
  },
  ...
]`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert music DJ. Respond only with valid JSON arrays."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0].message.content.trim();
    
    let playlistTracks;
    try {
      playlistTracks = JSON.parse(content);
    } catch (error) {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        playlistTracks = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid response format from AI');
      }
    }

    // Validate the response
    if (!Array.isArray(playlistTracks) || playlistTracks.length === 0) {
      throw new Error('AI did not return a valid playlist');
    }

    const availableTrackIds = tracks.map(t => t.id);
    const validPlaylistTracks = playlistTracks
      .filter(item => 
        item.trackId && 
        availableTrackIds.includes(item.trackId) &&
        item.weight >= 0.1 &&
        item.weight <= 1.0 &&
        item.order >= 1 &&
        item.order <= trackCount
      )
      .slice(0, trackCount); 

    validPlaylistTracks.sort((a, b) => a.order - b.order);

    return validPlaylistTracks;

  } catch (error) {
    console.error('Error generating playlist:', error);
    throw error;
  }
}

module.exports = { generatePlaylistFromMood };