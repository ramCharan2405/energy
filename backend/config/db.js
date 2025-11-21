const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // These options are no longer needed in Mongoose 6+
            // but keeping them doesn't hurt
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        logger.info(`Database: ${conn.connection.name}`);

        // Connection event listeners
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });

        return conn;
    } catch (error) {
        logger.error('Error connecting to MongoDB:', error.message);
        logger.warn('⚠️  Server will continue running but database features will be unavailable');
        logger.warn('⚠️  This is acceptable for development/testing without MongoDB');
        logger.warn('⚠️  Install MongoDB from: https://www.mongodb.com/try/download/community');
        // Don't exit - allow server to run without MongoDB for testing
        return null;
    }
};

/**
 * Close database connection
 */
const closeDB = async () => {
    try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
    } catch (error) {
        logger.error('Error closing MongoDB connection:', error.message);
    }
};

/**
 * Get database connection status
 */
const getConnectionStatus = () => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    return states[mongoose.connection.readyState];
};

module.exports = {
    connectDB,
    closeDB,
    getConnectionStatus,
};
