const express = require('express');
const router = express.Router();
const upload = require('../utils/fileUpload');
const trackController = require('../controllers/trackController');

router.post('/upload', upload.single('audio'), trackController.uploadTrack);

router.get('/', trackController.getAllTracks);

router.get('/play/:trackId', trackController.streamTrack);

module.exports = router;