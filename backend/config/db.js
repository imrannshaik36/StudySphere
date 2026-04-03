const mongoose = require('mongoose');

const connectDB = async () => {
    // Providing a default fallback to local MongoDB if ATLAS is not configured in .env
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studysphere';
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connect Error: ${error.message}`);
        // Let the app continue running; it might log errors on DB actions if unconnected
    }
}

module.exports = connectDB;
