#!/usr/bin/env python3
"""
Stock Data Web Scraper
Scrapes real-time stock data from multiple sources including Yahoo Finance, Google Finance, and others
"""

import sys
import json
import time
import random
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import yfinance as yf
import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr),
        logging.FileHandler('scraper.log')
    ]
)
logger = logging.getLogger(__name__)

class AdaptiveRateLimiter:
    """Adaptive rate limiter that adjusts delays based on request frequency"""
    
    def __init__(self, max_requests_per_minute=50, base_delay=0.1):
        self.max_requests_per_minute = max_requests_per_minute
        self.base_delay = base_delay
        self.request_times = []
        self.error_count = 0
        self.last_error_time = 0
    
    def wait_if_needed(self):
        """Wait if rate limit is approaching"""
        now = time.time()
        
        # Remove requests older than 1 minute
        self.request_times = [t for t in self.request_times if now - t < 60]
        
        # Calculate current request rate
        current_rate = len(self.request_times)
        
        # Adjust delay based on current rate and error history
        if current_rate >= self.max_requests_per_minute * 0.8:  # 80% of limit
            delay = self.base_delay * 2
            logger.info(f"Rate limit approaching ({current_rate}/{self.max_requests_per_minute}), waiting {delay}s")
            time.sleep(delay)
        
        # Add jitter to avoid synchronized requests
        jitter = random.uniform(0, 0.1)
        time.sleep(jitter)
        
        self.request_times.append(now)
    
    def handle_error(self):
        """Handle errors by increasing delays"""
        now = time.time()
        self.error_count += 1
        
        # If multiple errors in short time, increase delay
        if now - self.last_error_time < 60 and self.error_count > 3:
            self.base_delay = min(self.base_delay * 1.5, 1.0)  # Max 1 second delay
            logger.warning(f"Multiple errors detected, increasing base delay to {self.base_delay}s")
        
        self.last_error_time = now
    
    def reset_error_count(self):
        """Reset error count after successful requests"""
        self.error_count = 0

class DataValidator:
    """Validate scraped data before returning"""
    
    @staticmethod
    def validate_quote_data(data: Dict[str, Any]) -> bool:
        """Validate stock quote data"""
        required_fields = ['symbol', 'price']
        
        # Check required fields exist
        if not all(field in data for field in required_fields):
            return False
        
        # Check data types and values
        if not isinstance(data['symbol'], str) or len(data['symbol']) == 0:
            return False
        
        if not isinstance(data['price'], (int, float)) or data['price'] <= 0:
            return False
        
        # Check for error indicators
        if 'error' in data and data['error']:
            return False
        
        return True
    
    @staticmethod
    def validate_overview_data(data: Dict[str, Any]) -> bool:
        """Validate company overview data"""
        required_fields = ['symbol', 'company_name']
        
        if not all(field in data for field in required_fields):
            return False
        
        if not isinstance(data['symbol'], str) or len(data['symbol']) == 0:
            return False
        
        if 'error' in data and data['error']:
            return False
        
        return True

class StockScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.cache = {}
        self.cache_ttl = 300  # 5 minutes cache
        self.rate_limiter = AdaptiveRateLimiter()
        self.validator = DataValidator()
        
        # Performance metrics
        self.request_count = 0
        self.success_count = 0
        self.error_count = 0
        self.start_time = time.time()

    def get_cached_data(self, key: str) -> Optional[Dict]:
        """Get cached data if not expired"""
        if key in self.cache:
            timestamp, data = self.cache[key]
            if time.time() - timestamp < self.cache_ttl:
                return data
        return None

    def set_cached_data(self, key: str, data: Dict):
        """Cache data with timestamp"""
        self.cache[key] = (time.time(), data)

    def log_performance(self, operation: str, duration: float, success: bool = True):
        """Log performance metrics"""
        self.request_count += 1
        if success:
            self.success_count += 1
        else:
            self.error_count += 1
        
        logger.info(f"{operation} completed in {duration:.2f}s (success: {success})")
        
        # Log overall stats every 10 requests
        if self.request_count % 10 == 0:
            uptime = time.time() - self.start_time
            success_rate = (self.success_count / self.request_count) * 100
            requests_per_minute = (self.request_count / uptime) * 60
            logger.info(f"Stats: {self.request_count} requests, {success_rate:.1f}% success, {requests_per_minute:.1f} req/min")

    def scrape_yahoo_finance(self, symbol: str) -> Dict[str, Any]:
        """Scrape stock data from Yahoo Finance"""
        start_time = time.time()
        
        try:
            # Apply rate limiting
            self.rate_limiter.wait_if_needed()
            
            # Use yfinance library for reliable data
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Get current price and basic info
            current_price = ticker.history(period='1d')['Close'].iloc[-1] if not ticker.history(period='1d').empty else 0
            
            # Get real-time quote
            quote = {
                'symbol': symbol,
                'price': current_price,
                'change': info.get('regularMarketChange', 0),
                'change_percent': info.get('regularMarketChangePercent', 0),
                'volume': info.get('volume', 0),
                'market_cap': info.get('marketCap', 0),
                'pe_ratio': info.get('trailingPE', 0),
                'eps': info.get('trailingEps', 0),
                'dividend_yield': info.get('dividendYield', 0),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh', 0),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow', 0),
                'sector': info.get('sector', 'Unknown'),
                'industry': info.get('industry', 'Unknown'),
                'company_name': info.get('longName', symbol),
                'currency': info.get('currency', 'USD'),
                'exchange': info.get('exchange', 'Unknown'),
                'timestamp': datetime.now().isoformat()
            }
            
            # Validate data before returning
            if not self.validator.validate_quote_data(quote):
                raise ValueError(f"Invalid quote data for {symbol}")
            
            duration = time.time() - start_time
            self.log_performance(f"Yahoo Finance scrape for {symbol}", duration, True)
            self.rate_limiter.reset_error_count()
            
            return quote
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_performance(f"Yahoo Finance scrape for {symbol}", duration, False)
            self.rate_limiter.handle_error()
            logger.error(f"Error scraping Yahoo Finance for {symbol}: {str(e)}")
            return self._get_fallback_data(symbol)

    def scrape_google_finance(self, symbol: str) -> Dict[str, Any]:
        """Scrape stock data from Google Finance (fallback)"""
        start_time = time.time()
        
        try:
            # Apply rate limiting
            self.rate_limiter.wait_if_needed()
            
            url = f"https://www.google.com/finance/quote/{symbol}"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract basic price information
            price_elem = soup.find('div', {'data-last-price': True})
            price = float(price_elem['data-last-price']) if price_elem else 0
            
            change_elem = soup.find('div', {'data-change': True})
            change = float(change_elem['data-change']) if change_elem else 0
            
            quote = {
                'symbol': symbol,
                'price': price,
                'change': change,
                'change_percent': (change / price * 100) if price > 0 else 0,
                'source': 'Google Finance',
                'timestamp': datetime.now().isoformat()
            }
            
            # Validate data before returning
            if not self.validator.validate_quote_data(quote):
                raise ValueError(f"Invalid quote data for {symbol}")
            
            duration = time.time() - start_time
            self.log_performance(f"Google Finance scrape for {symbol}", duration, True)
            self.rate_limiter.reset_error_count()
            
            return quote
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_performance(f"Google Finance scrape for {symbol}", duration, False)
            self.rate_limiter.handle_error()
            logger.error(f"Error scraping Google Finance for {symbol}: {str(e)}")
            return self._get_fallback_data(symbol)

    def _get_fallback_data(self, symbol: str) -> Dict[str, Any]:
        """Return fallback data when scraping fails"""
        return {
            'symbol': symbol,
            'price': 0,
            'change': 0,
            'change_percent': 0,
            'error': 'Scraping failed',
            'timestamp': datetime.now().isoformat()
        }

    def get_intraday_data(self, symbol: str, interval: str = '5min') -> Dict[str, Any]:
        """Get intraday data using yfinance"""
        start_time = time.time()
        
        try:
            self.rate_limiter.wait_if_needed()
            
            ticker = yf.Ticker(symbol)
            
            # Map interval to yfinance format
            interval_map = {
                '1min': '1m',
                '5min': '5m',
                '15min': '15m',
                '30min': '30m',
                '60min': '1h'
            }
            
            yf_interval = interval_map.get(interval, '5m')
            
            # Get intraday data for the last 5 days
            data = ticker.history(period='5d', interval=yf_interval)
            
            if data.empty:
                return {'symbol': symbol, 'data': [], 'error': 'No data available'}
            
            # Convert to list of OHLC data
            intraday_data = []
            for timestamp, row in data.iterrows():
                intraday_data.append({
                    'timestamp': timestamp.isoformat(),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume'])
                })
            
            result = {
                'symbol': symbol,
                'interval': interval,
                'data': intraday_data,
                'count': len(intraday_data)
            }
            
            duration = time.time() - start_time
            self.log_performance(f"Intraday data for {symbol}", duration, True)
            self.rate_limiter.reset_error_count()
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_performance(f"Intraday data for {symbol}", duration, False)
            self.rate_limiter.handle_error()
            logger.error(f"Error getting intraday data for {symbol}: {str(e)}")
            return {'symbol': symbol, 'data': [], 'error': str(e)}

    def get_daily_data(self, symbol: str, days: int = 30) -> Dict[str, Any]:
        """Get daily data using yfinance"""
        start_time = time.time()
        
        try:
            self.rate_limiter.wait_if_needed()
            
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=f'{days}d')
            
            if data.empty:
                return {'symbol': symbol, 'data': [], 'error': 'No data available'}
            
            # Convert to list of daily data
            daily_data = []
            for timestamp, row in data.iterrows():
                daily_data.append({
                    'date': timestamp.strftime('%Y-%m-%d'),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume']),
                    'adj_close': float(row['Adj Close'])
                })
            
            result = {
                'symbol': symbol,
                'period': f'{days} days',
                'data': daily_data,
                'count': len(daily_data)
            }
            
            duration = time.time() - start_time
            self.log_performance(f"Daily data for {symbol}", duration, True)
            self.rate_limiter.reset_error_count()
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_performance(f"Daily data for {symbol}", duration, False)
            self.rate_limiter.handle_error()
            logger.error(f"Error getting daily data for {symbol}: {str(e)}")
            return {'symbol': symbol, 'data': [], 'error': str(e)}

    def search_symbols(self, query: str) -> Dict[str, Any]:
        """Search for stock symbols"""
        start_time = time.time()
        
        try:
            self.rate_limiter.wait_if_needed()
            
            # Use yfinance search functionality
            search_results = yf.Tickers(query)
            
            results = []
            for ticker in search_results.tickers[:10]:  # Limit to 10 results
                try:
                    info = ticker.info
                    results.append({
                        'symbol': info.get('symbol', ''),
                        'name': info.get('longName', ''),
                        'exchange': info.get('exchange', ''),
                        'type': info.get('quoteType', ''),
                        'sector': info.get('sector', ''),
                        'industry': info.get('industry', '')
                    })
                except:
                    continue
            
            result = {
                'query': query,
                'results': results,
                'count': len(results)
            }
            
            duration = time.time() - start_time
            self.log_performance(f"Symbol search for {query}", duration, True)
            self.rate_limiter.reset_error_count()
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_performance(f"Symbol search for {query}", duration, False)
            self.rate_limiter.handle_error()
            logger.error(f"Error searching symbols for {query}: {str(e)}")
            return {'query': query, 'results': [], 'error': str(e)}

    def get_company_overview(self, symbol: str) -> Dict[str, Any]:
        """Get comprehensive company overview"""
        start_time = time.time()
        
        try:
            self.rate_limiter.wait_if_needed()
            
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            overview = {
                'symbol': symbol,
                'company_name': info.get('longName', ''),
                'sector': info.get('sector', ''),
                'industry': info.get('industry', ''),
                'market_cap': info.get('marketCap', 0),
                'enterprise_value': info.get('enterpriseValue', 0),
                'pe_ratio': info.get('trailingPE', 0),
                'forward_pe': info.get('forwardPE', 0),
                'peg_ratio': info.get('pegRatio', 0),
                'price_to_book': info.get('priceToBook', 0),
                'price_to_sales': info.get('priceToSalesTrailing12Months', 0),
                'dividend_yield': info.get('dividendYield', 0),
                'payout_ratio': info.get('payoutRatio', 0),
                'beta': info.get('beta', 0),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh', 0),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow', 0),
                'fifty_day_average': info.get('fiftyDayAverage', 0),
                'two_hundred_day_average': info.get('twoHundredDayAverage', 0),
                'volume': info.get('volume', 0),
                'avg_volume': info.get('averageVolume', 0),
                'shares_outstanding': info.get('sharesOutstanding', 0),
                'float_shares': info.get('floatShares', 0),
                'insider_ownership': info.get('heldPercentInsiders', 0),
                'institutional_ownership': info.get('heldPercentInstitutions', 0),
                'return_on_equity': info.get('returnOnEquity', 0),
                'return_on_assets': info.get('returnOnAssets', 0),
                'profit_margins': info.get('profitMargins', 0),
                'operating_margins': info.get('operatingMargins', 0),
                'ebitda_margins': info.get('ebitdaMargins', 0),
                'revenue_growth': info.get('revenueGrowth', 0),
                'earnings_growth': info.get('earningsGrowth', 0),
                'revenue': info.get('totalRevenue', 0),
                'gross_profits': info.get('grossProfits', 0),
                'ebitda': info.get('ebitda', 0),
                'net_income': info.get('netIncomeToCommon', 0),
                'total_cash': info.get('totalCash', 0),
                'total_debt': info.get('totalDebt', 0),
                'debt_to_equity': info.get('debtToEquity', 0),
                'current_ratio': info.get('currentRatio', 0),
                'quick_ratio': info.get('quickRatio', 0),
                'cash_per_share': info.get('totalCashPerShare', 0),
                'book_value': info.get('bookValue', 0),
                'cash_flow': info.get('operatingCashflow', 0),
                'free_cash_flow': info.get('freeCashflow', 0),
                'timestamp': datetime.now().isoformat()
            }
            
            # Validate data before returning
            if not self.validator.validate_overview_data(overview):
                raise ValueError(f"Invalid overview data for {symbol}")
            
            duration = time.time() - start_time
            self.log_performance(f"Company overview for {symbol}", duration, True)
            self.rate_limiter.reset_error_count()
            
            return overview
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_performance(f"Company overview for {symbol}", duration, False)
            self.rate_limiter.handle_error()
            logger.error(f"Error getting company overview for {symbol}: {str(e)}")
            return {'symbol': symbol, 'error': str(e)}

    def get_sector_performance(self) -> Dict[str, Any]:
        """Get sector performance data"""
        start_time = time.time()
        
        try:
            # Define major sectors
            sectors = [
                'XLK',  # Technology
                'XLF',  # Financials
                'XLE',  # Energy
                'XLV',  # Healthcare
                'XLI',  # Industrials
                'XLP',  # Consumer Staples
                'XLY',  # Consumer Discretionary
                'XLU',  # Utilities
                'XLB',  # Materials
                'XLRE'  # Real Estate
            ]
            
            sector_data = []
            for sector_etf in sectors:
                try:
                    self.rate_limiter.wait_if_needed()
                    
                    ticker = yf.Ticker(sector_etf)
                    info = ticker.info
                    
                    sector_info = {
                        'sector': info.get('longName', sector_etf),
                        'symbol': sector_etf,
                        'price': ticker.history(period='1d')['Close'].iloc[-1] if not ticker.history(period='1d').empty else 0,
                        'change': info.get('regularMarketChange', 0),
                        'change_percent': info.get('regularMarketChangePercent', 0),
                        'volume': info.get('volume', 0),
                        'market_cap': info.get('marketCap', 0)
                    }
                    sector_data.append(sector_info)
                    
                except Exception as e:
                    logger.error(f"Error getting sector data for {sector_etf}: {str(e)}")
                    continue
            
            result = {
                'sectors': sector_data,
                'count': len(sector_data),
                'timestamp': datetime.now().isoformat()
            }
            
            duration = time.time() - start_time
            self.log_performance(f"Sector performance", duration, True)
            self.rate_limiter.reset_error_count()
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_performance(f"Sector performance", duration, False)
            self.rate_limiter.handle_error()
            logger.error(f"Error getting sector performance: {str(e)}")
            return {'sectors': [], 'error': str(e)}

    def get_batch_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """Get batch quotes for multiple symbols"""
        start_time = time.time()
        
        try:
            results = []
            for symbol in symbols:
                # Try Yahoo Finance first, fallback to Google Finance
                quote = self.scrape_yahoo_finance(symbol)
                if quote.get('error'):
                    quote = self.scrape_google_finance(symbol)
                
                results.append(quote)
            
            result = {
                'symbols': symbols,
                'results': results,
                'count': len(results),
                'timestamp': datetime.now().isoformat()
            }
            
            duration = time.time() - start_time
            self.log_performance(f"Batch quotes for {len(symbols)} symbols", duration, True)
            self.rate_limiter.reset_error_count()
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            self.log_performance(f"Batch quotes for {len(symbols)} symbols", duration, False)
            self.rate_limiter.handle_error()
            logger.error(f"Error getting batch quotes: {str(e)}")
            return {'symbols': symbols, 'results': [], 'error': str(e)}

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No symbols provided'}), file=sys.stderr)
        sys.exit(1)
    
    try:
        symbols = json.loads(sys.argv[1])
        endpoint = sys.argv[2] if len(sys.argv) > 2 else 'batch'
        
        if not isinstance(symbols, list):
            symbols = [symbols]
        
        scraper = StockScraper()
        
        if endpoint == 'quote':
            if len(symbols) == 1:
                result = scraper.scrape_yahoo_finance(symbols[0])
            else:
                result = scraper.get_batch_quotes(symbols)
        elif endpoint == 'intraday':
            result = scraper.get_intraday_data(symbols[0])
        elif endpoint == 'daily':
            result = scraper.get_daily_data(symbols[0])
        elif endpoint == 'search':
            result = scraper.search_symbols(symbols[0])
        elif endpoint == 'overview':
            result = scraper.get_company_overview(symbols[0])
        elif endpoint == 'sectors':
            result = scraper.get_sector_performance()
        elif endpoint == 'batch':
            result = scraper.get_batch_quotes(symbols)
        else:
            result = {'error': f'Unknown endpoint: {endpoint}'}
        
        # Log final performance summary
        uptime = time.time() - scraper.start_time
        success_rate = (scraper.success_count / scraper.request_count) * 100 if scraper.request_count > 0 else 0
        logger.info(f"Final Stats: {scraper.request_count} requests, {success_rate:.1f}% success, {uptime:.1f}s uptime")
        
        # Output JSON to stdout
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError:
        print(json.dumps({'error': 'Invalid JSON in symbols argument'}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
