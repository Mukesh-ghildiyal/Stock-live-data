import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import { stocksRouter } from './stocks/routes.js';
import { getEnv } from './utils/env.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Performance monitoring
const startTime = Date.now();
let requestCount = 0;
let errorCount = 0;
let pythonProcessCount = 0;

// Enhanced logging middleware
const logRequest = (req, res, next) => {
  const start = performance.now();
  requestCount++;
  
  // Log request start
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request #${requestCount}`);
  
  // Override res.end to log response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = performance.now() - start;
    const status = res.statusCode;
    
    if (status >= 400) {
      errorCount++;
      console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${status} (${duration.toFixed(2)}ms) - ERROR`);
    } else {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${status} (${duration.toFixed(2)}ms) - SUCCESS`);
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Basic security headers
app.use(helmet());

// Enhanced logging
app.use(morgan('combined'));
app.use(logRequest);

// JSON parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
const allowedOrigins = [
  getEnv('FRONTEND_ORIGIN', ''),
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser or same-origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.options('*', cors());

// Enhanced rate limiting with different tiers
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for heavy operations
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(getEnv('API_RATE_LIMIT_PER_MINUTE', '60'), 10),
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/scrape', strictLimiter); // Heavy operations
app.use('/api', standardLimiter); // Standard operations

// Health check with performance metrics
app.get('/health', (req, res) => {
  const uptime = Date.now() - startTime;
  const uptimeMinutes = Math.floor(uptime / 60000);
  const successRate = requestCount > 0 ? ((requestCount - errorCount) / requestCount) * 100 : 0;
  
  res.json({ 
    status: 'ok', 
    uptime: uptime,
    uptimeMinutes,
    requestCount,
    errorCount,
    successRate: successRate.toFixed(2),
    pythonProcessCount,
    timestamp: new Date().toISOString()
  });
});

// Performance metrics endpoint
app.get('/api/metrics', (req, res) => {
  const uptime = Date.now() - startTime;
  const uptimeMinutes = Math.floor(uptime / 60000);
  const successRate = requestCount > 0 ? ((requestCount - errorCount) / requestCount) * 100 : 0;
  const requestsPerMinute = (requestCount / uptimeMinutes) || 0;
  
  res.json({
    uptime: {
      total: uptime,
      minutes: uptimeMinutes,
      formatted: `${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m ${Math.floor((uptime % 60000) / 1000)}s`
    },
    requests: {
      total: requestCount,
      errors: errorCount,
      success: requestCount - errorCount,
      successRate: successRate.toFixed(2),
      requestsPerMinute: requestsPerMinute.toFixed(2)
    },
    python: {
      processesCreated: pythonProcessCount
    },
    timestamp: new Date().toISOString()
  });
});

// Web scraping endpoint with enhanced error handling
app.post('/api/scrape', async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols array required' });
    }

    if (symbols.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 symbols allowed per request' });
    }

    const pythonScript = path.join(__dirname, '..', 'scripts', 'scraper.py');
    const pythonProcess = spawn('python', [pythonScript, JSON.stringify(symbols)]);
    
    pythonProcessCount++;

    let data = '';
    let error = '';
    const startTime = performance.now();

    pythonProcess.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      error += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      const duration = performance.now() - startTime;
      
      if (code !== 0) {
        console.error(`Python script error (${duration.toFixed(2)}ms):`, error);
        return res.status(500).json({ 
          error: 'Scraping failed', 
          details: error,
          duration: Math.round(duration),
          symbols: symbols
        });
      }

      try {
        const scrapedData = JSON.parse(data);
        console.log(`Scraping completed successfully (${duration.toFixed(2)}ms) for ${symbols.length} symbols`);
        
        res.json({ 
          success: true, 
          data: scrapedData,
          duration: Math.round(duration),
          symbols: symbols,
          timestamp: new Date().toISOString()
        });
      } catch (parseError) {
        console.error('Failed to parse Python output:', parseError);
        res.status(500).json({ 
          error: 'Invalid data format from scraper',
          duration: Math.round(duration),
          symbols: symbols
        });
      }
    });

    pythonProcess.on('error', (err) => {
      const duration = performance.now() - startTime;
      console.error(`Failed to start Python process (${duration.toFixed(2)}ms):`, err);
      res.status(500).json({ 
        error: 'Failed to start scraper',
        duration: Math.round(duration),
        symbols: symbols
      });
    });

    // Add timeout for Python process
    const timeout = setTimeout(() => {
      pythonProcess.kill('SIGTERM');
      const duration = performance.now() - startTime;
      console.error(`Python process timeout (${duration.toFixed(2)}ms) for ${symbols.length} symbols`);
      res.status(408).json({ 
        error: 'Scraping timeout - process took too long',
        duration: Math.round(duration),
        symbols: symbols
      });
    }, 60000); // 60 second timeout

    pythonProcess.on('close', () => {
      clearTimeout(timeout);
    });

  } catch (err) {
    const duration = performance.now() - startTime;
    console.error(`Scraping endpoint error (${duration.toFixed(2)}ms):`, err);
    res.status(500).json({ 
      error: 'Internal server error',
      duration: Math.round(duration)
    });
  }
});

// Routes
app.use('/api/stocks', stocksRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Enhanced error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  errorCount++;
  
  // Avoid leaking internals in production
  const isProd = getEnv('NODE_ENV', 'development') === 'production';
  const message = isProd ? 'Internal Server Error' : err.message;
  const status = err.status || 500;
  
  console.error(`Error ${status} for ${req.method} ${req.path}:`, err);
  
  res.status(status).json({ 
    error: message,
    status: status,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

const PORT = parseInt(getEnv('PORT', '3001'), 10);

// Graceful shutdown handling
const server = app.listen(PORT, () => {
  const uptime = Date.now() - startTime;
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
  console.log(`📊 Performance monitoring enabled`);
  console.log(`🔒 Security headers and rate limiting active`);
  console.log(`🐍 Python scraper integration ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Log startup completion
const startupTime = Date.now() - startTime;
console.log(`✅ Server startup completed in ${startupTime}ms`);
