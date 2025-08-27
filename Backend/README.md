# Insight-Vest Backend (Web Scraping)

## Architecture
This backend uses Node.js for the API server and Python for web scraping stock data from multiple sources including Yahoo Finance and Google Finance.

## Setup

### Backend (Node.js)
1. Create an `.env` file in `Backend/` with:
```
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
API_RATE_LIMIT_PER_MINUTE=60
NODE_ENV=development
```

2. Install Node.js dependencies:
```
cd Backend
npm install
```

### Python Scraper
1. Install Python 3.8+ and pip
2. Install Python dependencies:
```
cd Backend
pip install -r requirements.txt
```

3. Run the server (dev):
```
npm run dev
```

Or production:
```
npm start
```

The server will start at `http://localhost:3001`.

## Endpoints

Base path: `/api/stocks`

- `GET /quote/:symbol` — real-time quote
- `GET /intraday/:symbol?interval=5min&outputsize=compact` — intraday series
- `GET /daily/:symbol?outputsize=compact` — daily adjusted series
- `GET /search?q=tesla` — symbol search
- `GET /overview/:symbol` — company overview
- `GET /sectors` — sector performance
- `GET /batch?symbols=AAPL,MSFT,GOOGL` — batch quotes

Additional endpoint:
- `POST /api/scrape` — direct scraping with symbols array in body

## How It Works

1. **Node.js API Server**: Handles HTTP requests and routes
2. **Python Scraper**: Executed as subprocess to scrape real-time data
3. **Data Sources**: 
   - Primary: Yahoo Finance (via yfinance library)
   - Fallback: Google Finance (via BeautifulSoup)
   - Sector data: Major sector ETFs
4. **Caching**: Built-in caching to reduce API calls and respect rate limits

## Data Sources

- **Yahoo Finance**: Primary source for stock quotes, company info, financial metrics
- **Google Finance**: Fallback source for basic price data
- **Sector ETFs**: XLK, XLF, XLE, XLV, XLI, XLP, XLY, XLU, XLB, XLRE

## Notes

- Python scraper runs as subprocess from Node.js
- Built-in rate limiting and delays to avoid being blocked
- Comprehensive error handling and fallback mechanisms
- Real-time data from multiple financial sources
- No external API keys required
