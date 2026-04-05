import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level}] [E2E]: ${message}`;
  })
);

const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'e2e-error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'e2e-combined.log') 
    }),
  ],
});

export default logger;
