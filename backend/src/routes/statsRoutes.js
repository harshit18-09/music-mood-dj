const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/top-tracks', statsController.getTopTracks);

router.delete('/cache', statsController.clearCache);

module.exports = router;