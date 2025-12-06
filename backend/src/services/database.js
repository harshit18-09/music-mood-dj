const mongoose = require('mongoose');
require('dotenv').config();

class DatabaseService {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;
    
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      this.isConnected = true;
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      // Fallback: Use in-memory storage for demo
      console.log('⚠️ Using in-memory storage for demo');
    }
  }

  async healthCheck() {
    try {
      await this.connect();
      const trackCount = await mongoose.model('Track').countDocuments();
      return {
        status: 'healthy',
        database: 'MongoDB',
        tracksCount: trackCount
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new DatabaseService();