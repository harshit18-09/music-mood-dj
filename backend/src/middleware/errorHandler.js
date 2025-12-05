const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);
    
    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle specific error types
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File size exceeds limit (max 50MB)';
    }

    res.status(statusCode).json({
        success: false,
        error: message
    });
};

module.exports = errorHandler;