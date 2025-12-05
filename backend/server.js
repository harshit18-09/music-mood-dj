const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const trackRoutes = require('./src/routes/trackRoutes');
const playlistRoutes = require('./src/routes/playlistRoutes');
const statsRoutes = require('./src/routes/statsRoutes');
const errorHandler = require('./src/middleware/errorHandler'); 

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/tracks', trackRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
});