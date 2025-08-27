import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const stocksRouter = Router();

// Helper function to run Python scraper
async function runScraper(symbols, endpoint) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', '..', 'scripts', 'scraper.py');
    const pythonProcess = spawn('python', [pythonScript, JSON.stringify(symbols), endpoint]);

    let data = '';
    let error = '';

    pythonProcess.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      error += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${error}`));
        return;
      }

      try {
        const scrapedData = JSON.parse(data);
        resolve(scrapedData);
      } catch (parseError) {
        reject(new Error('Invalid data format from scraper'));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

stocksRouter.get('/quote/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const data = await runScraper([symbol], 'quote');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

stocksRouter.get('/intraday/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { interval = '5min', outputsize = 'compact' } = req.query;
    const data = await runScraper([symbol], 'intraday');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

stocksRouter.get('/daily/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { outputsize = 'compact' } = req.query;
    const data = await runScraper([symbol], 'daily');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

stocksRouter.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query param q' });
    const data = await runScraper([q], 'search');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

stocksRouter.get('/overview/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const data = await runScraper([symbol], 'overview');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

stocksRouter.get('/sectors', async (req, res, next) => {
  try {
    const data = await runScraper([], 'sectors');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

stocksRouter.get('/batch', async (req, res, next) => {
  try {
    const { symbols } = req.query;
    if (!symbols) return res.status(400).json({ error: 'Missing query param symbols (CSV)' });
    
    const symbolArray = symbols.split(',').map(s => s.trim()).filter(Boolean);
    const data = await runScraper(symbolArray, 'batch');
    res.json(data);
  } catch (err) {
    next(err);
  }
});
