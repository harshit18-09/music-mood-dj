const API_BASE_URL = 'http://localhost:3000/api';
let currentPlaylist = [];
let currentTrackIndex = -1;
let isPlaying = false;

// DOM Elements
const audioPlayer = document.getElementById('audioPlayer');
const uploadForm = document.getElementById('uploadForm');
const playlistForm = document.getElementById('playlistForm');
const audioFileInput = document.getElementById('audioFile');
const fileNameSpan = document.getElementById('fileName');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const volumeSlider = document.getElementById('volume');
const progressFill = document.getElementById('progressFill');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');
const currentTrackSpan = document.getElementById('currentTrack');
const currentArtistSpan = document.getElementById('currentArtist');
const tracksListDiv = document.getElementById('tracksList');
const playlistTracksDiv = document.getElementById('playlistTracks');
const topTracksDiv = document.getElementById('topTracks');
const refreshStatsBtn = document.getElementById('refreshStats');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTracks();
    loadTopTracks();
    setupEventListeners();
});

function setupEventListeners() {
    // File upload
    audioFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameSpan.textContent = `Selected: ${e.target.files[0].name}`;
        }
    });

    uploadForm.addEventListener('submit', handleUpload);
    playlistForm.addEventListener('submit', handlePlaylistGeneration);
    
    // Player controls
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    volumeSlider.addEventListener('input', updateVolume);
    
    // Progress bar click
    document.querySelector('.progress-bar').addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = percent * audioPlayer.duration;
    });
    
    // Audio events
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('ended', playNext);
    
    // Refresh stats
    refreshStatsBtn.addEventListener('click', loadTopTracks);
}

// File Upload
async function handleUpload(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const file = audioFileInput.files[0];
    const title = document.getElementById('title').value || file.name;
    const artist = document.getElementById('artist').value || 'Unknown Artist';
    
    if (!file) {
        showStatus('uploadStatus', 'Please select a file', 'error');
        return;
    }
    
    formData.append('audio', file);
    formData.append('title', title);
    formData.append('artist', artist);
    
    try {
        showStatus('uploadStatus', 'Uploading...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/tracks/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus('uploadStatus', 'Track uploaded successfully!', 'success');
            uploadForm.reset();
            fileNameSpan.textContent = '';
            loadTracks();
            loadTopTracks();
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        showStatus('uploadStatus', `Error: ${error.message}`, 'error');
    }
}

// Playlist Generation
async function handlePlaylistGeneration(e) {
    e.preventDefault();
    
    const mood = document.getElementById('mood').value;
    const trackCount = document.getElementById('trackCount').value;
    
    if (!mood) {
        showStatus('playlistStatus', 'Please enter a mood', 'error');
        return;
    }
    
    try {
        showStatus('playlistStatus', 'Generating playlist with AI...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/playlists/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mood, trackCount })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus('playlistStatus', 'Playlist generated successfully!', 'success');
            displayPlaylist(data.playlist);
            playlistForm.reset();
        } else {
            throw new Error(data.error || 'Playlist generation failed');
        }
    } catch (error) {
        showStatus('playlistStatus', `Error: ${error.message}`, 'error');
    }
}

// Load All Tracks
async function loadTracks() {
    try {
        tracksListDiv.innerHTML = '<div class="loading">Loading tracks...</div>';
        
        const response = await fetch(`${API_BASE_URL}/tracks`);
        const tracks = await response.json();
        
        if (tracks.length === 0) {
            tracksListDiv.innerHTML = '<div class="status info">No tracks uploaded yet.</div>';
            return;
        }
        
        let html = '';
        tracks.forEach(track => {
            html += `
                <div class="track-item" data-id="${track.id}">
                    <div class="track-info">
                        <div class="track-title">${track.title}</div>
                        <div class="track-artist">${track.artist}</div>
                    </div>
                    <div class="track-duration">${formatTime(track.duration)}</div>
                    <div class="track-actions">
                        <button class="play-btn-track" onclick="playTrack('${track.id}', '${track.title}', '${track.artist}')">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        tracksListDiv.innerHTML = html;
    } catch (error) {
        tracksListDiv.innerHTML = `<div class="status error">Error loading tracks: ${error.message}</div>`;
    }
}

// Load Top Tracks
async function loadTopTracks() {
    try {
        topTracksDiv.innerHTML = '<div class="loading">Loading top tracks...</div>';
        
        const response = await fetch(`${API_BASE_URL}/stats/top-tracks?limit=10`);
        const data = await response.json();
        
        if (data.tracks.length === 0) {
            topTracksDiv.innerHTML = '<div class="status info">No statistics available yet.</div>';
            return;
        }
        
        let html = '';
        data.tracks.forEach((track, index) => {
            html += `
                <div class="top-tracks-item">
                    <div class="rank">${index + 1}</div>
                    <div class="track-stats">
                        <div class="track-title">${track.title}</div>
                        <div class="track-artist">${track.artist}</div>
                        <div class="play-count">Played ${track.playCount} times</div>
                    </div>
                    <button class="play-btn-track" onclick="playTrack('${track.id}', '${track.title}', '${track.artist}')">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            `;
        });
        
        topTracksDiv.innerHTML = html;
    } catch (error) {
        topTracksDiv.innerHTML = `<div class="status error">Error loading top tracks: ${error.message}</div>`;
    }
}

// Display Playlist
function displayPlaylist(playlist) {
    currentPlaylist = playlist.tracks.map(pt => ({
        id: pt.track.id,
        title: pt.track.title,
        artist: pt.track.artist,
        weight: pt.weight,
        order: pt.order,
        url: `/api/tracks/play/${pt.track.id}`
    }));
    
    currentPlaylist.sort((a, b) => a.order - b.order);
    currentTrackIndex = 0;
    
    let html = '';
    currentPlaylist.forEach((track, index) => {
        html += `
            <div class="track-item ${index === currentTrackIndex ? 'active' : ''}" onclick="playFromPlaylist(${index})">
                <div class="track-info">
                    <div class="track-title">${track.title} <span class="weight">(${track.weight.toFixed(2)})</span></div>
                    <div class="track-artist">${track.artist}</div>
                </div>
                <div class="track-duration">#${track.order}</div>
            </div>
        `;
    });
    
    playlistTracksDiv.innerHTML = html;
    playTrack(currentPlaylist[0].id, currentPlaylist[0].title, currentPlaylist[0].artist);
}

// Play Track
async function playTrack(trackId, title, artist) {
    try {
        const audioUrl = `${API_BASE_URL}/tracks/play/${trackId}`;
        audioPlayer.src = audioUrl;
        
        currentTrackSpan.textContent = title;
        currentArtistSpan.textContent = artist;
        
        await audioPlayer.play();
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        // Highlight current track in playlist
        document.querySelectorAll('.track-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const currentItem = document.querySelector(`[data-id="${trackId}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
    } catch (error) {
        showStatus('playlistStatus', `Error playing track: ${error.message}`, 'error');
    }
}

// Play from Playlist
function playFromPlaylist(index) {
    if (currentPlaylist[index]) {
        currentTrackIndex = index;
        const track = currentPlaylist[index];
        playTrack(track.id, track.title, track.artist);
        
        // Update UI
        document.querySelectorAll('.playlist-tracks .track-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
    }
}

// Player Controls
function togglePlay() {
    if (audioPlayer.src) {
        if (isPlaying) {
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            audioPlayer.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        isPlaying = !isPlaying;
    }
}

function playPrevious() {
    if (currentPlaylist.length > 0) {
        currentTrackIndex = (currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        playFromPlaylist(currentTrackIndex);
    }
}

function playNext() {
    if (currentPlaylist.length > 0) {
        currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
        playFromPlaylist(currentTrackIndex);
    }
}

function updateVolume() {
    audioPlayer.volume = volumeSlider.value;
}

// Progress Updates
function updateProgress() {
    if (audioPlayer.duration) {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = `${percent}%`;
        currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
    }
}

function updateDuration() {
    durationSpan.textContent = formatTime(audioPlayer.duration);
}

// Utility Functions
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="status ${type}">${message}</div>`;
    
    setTimeout(() => {
        element.innerHTML = '';
    }, 5000);
}