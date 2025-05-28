const winston = require("winston");
const path = require("path");

// Define log directory
const logDirectory = path.join(__dirname, "../logs");

// Create a logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'kine_milk_server' },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
        // File transport for errors
        new winston.transports.File({
            filename: path.join(logDirectory, 'error.log'),
            level: 'error'
        }),
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(logDirectory, 'combined.log')
        })
    ]
});

// If in development mode, add a more verbose console transport
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.prettyPrint()
        ),
    }));
}

module.exports = logger;
