import { PortfolioStock, PortfolioSummary, SectorSummary } from '@/types/portfolio';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stockkklivedataaa.onrender.com';

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

// Performance monitoring
const measurePerformance = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`${name} completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

// Exponential backoff retry mechanism
const retryWithBackoff = async <T>(
  fn: () => Promise<T>, 
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000; // Add jitter
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay.toFixed(0)}ms delay`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

// Data validation for scraped results
const validateStockData = (data: any): boolean => {
  return data && 
         typeof data.price === 'number' && 
         data.price > 0 &&
         typeof data.symbol === 'string' &&
         data.symbol.length > 0 &&
         !data.error; // Ensure no error field
};

// Enhanced fetch with timeout and retry
const enhancedFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 30 second timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchPortfolioStocks = async (symbols?: string[]): Promise<PortfolioStock[]> => {
  return measurePerformance('fetchPortfolioStocks', async () => {
    if (!symbols || symbols.length === 0) {
      return [];
    }

    const cacheKey = symbols.join(',');
    
    // Check if request is already in progress
    if (pendingRequests.has(cacheKey)) {
      console.log('Request already in progress, reusing promise');
      return pendingRequests.get(cacheKey)!;
    }

    const request = retryWithBackoff(async () => {
      const symbolsParam = symbols.join(',');
      const url = `${API_BASE_URL}/api/stocks/batch?symbols=${encodeURIComponent(symbolsParam)}`;

      const response = await enhancedFetch(url);
      const data = await response.json();

      // Validate and transform scraped data to PortfolioStock format
      const validResults = (data.results || []).filter(validateStockData);
      
      if (validResults.length === 0) {
        throw new Error('No valid stock data received from scraper');
      }

      const stocks: PortfolioStock[] = validResults.map((result: any, index: number) => {
        const symbol: string = result.symbol || data.symbols?.[index] || `SYM${index + 1}`;
        const price = Number(result.price) || 0;
        const changePercent = Number(result.change_percent) || 0;
        
        // Calculate portfolio metrics
        const quantity = 100; // Default quantity for demo
        const purchasePrice = price * (1 - changePercent / 100); // Estimate purchase price
        const investment = purchasePrice * quantity;
        const presentValue = price * quantity;
        const gainLoss = presentValue - investment;
        const gainLossPercentage = investment > 0 ? (gainLoss / investment) * 100 : 0;

        const stock: PortfolioStock = {
          no: index + 1,
          particulars: result.company_name || symbol,
          purchasePrice: Math.round(purchasePrice * 100) / 100,
          quantity,
          investment: Math.round(investment),
          portfolioPercentage: 0, // Will be calculated later
          exchange: result.exchange || 'NYSE',
          sector: result.sector || 'Unknown',
          cmp: Math.round(price * 100) / 100,
          presentValue: Math.round(presentValue),
          gainLoss: Math.round(gainLoss),
          gainLossPercentage: Math.round(gainLossPercentage * 100) / 100,
          marketCap: result.market_cap || 0,
          peRatio: result.pe_ratio || 0,
          latestEarnings: 0,
          revenue: 0,
          ebitda: 0,
          ebitdaPercentage: 0,
          pat: 0,
          patPercentage: 0,
          cfo: 0,
          cfo5Years: 0,
          freeCashFlow5Years: 0,
          debtToEquity: result.debt_to_equity || 0,
          bookValue: result.book_value || 0,
          revenueGrowth: 0,
          ebitdaGrowth: 0,
          profitGrowth: 0,
          marketCapGrowth: 0,
          priceToSales: result.price_to_sales || 0,
          cfoToEbitda: 0,
          cfoToPat: 0,
          priceToBook: result.price_to_book || 0,
          stage2: gainLoss > 0 ? 'Buy' : 'Hold',
          salePrice: 0,
          abhishek: gainLoss > 0 ? 'Buy' : 'Hold',
        };
        return stock;
      });

      // Calculate portfolio percentages
      const totalInvestment = stocks.reduce((sum, stock) => sum + stock.investment, 0);
      stocks.forEach(stock => {
        stock.portfolioPercentage = totalInvestment > 0 ? (stock.investment / totalInvestment) * 100 : 0;
      });

      return stocks;
    });

    // Store the request promise
    pendingRequests.set(cacheKey, request);
    
    try {
      const result = await request;
      return result;
    } finally {
      // Clean up the pending request
      pendingRequests.delete(cacheKey);
    }
  });
};

export const fetchPortfolioSummary = async (symbols?: string[]): Promise<PortfolioSummary> => {
  return measurePerformance('fetchPortfolioSummary', async () => {
    if (!symbols || symbols.length === 0) {
      return {
        totalInvestment: 0,
        totalPresentValue: 0,
        totalGainLoss: 0,
        totalGainLossPercentage: 0,
        bestPerformer: 'N/A',
        worstPerformer: 'N/A'
      };
    }

      const stocks = await fetchPortfolioStocks(symbols);
      
      // Calculate summary from stocks data
      const totalInvestment = stocks.reduce((sum, stock) => sum + (stock.investment || 0), 0);
      const totalPresentValue = stocks.reduce((sum, stock) => sum + (stock.presentValue || 0), 0);
      const totalGainLoss = totalPresentValue - totalInvestment;
      const totalGainLossPercentage = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;
      
      // Find best and worst performers
      const sortedByPerformance = stocks.sort((a, b) => (b.gainLossPercentage || 0) - (a.gainLossPercentage || 0));
      const bestPerformer = sortedByPerformance[0]?.particulars || 'N/A';
      const worstPerformer = sortedByPerformance[sortedByPerformance.length - 1]?.particulars || 'N/A';
      
      return {
        totalInvestment,
        totalPresentValue,
        totalGainLoss,
        totalGainLossPercentage,
        bestPerformer,
        worstPerformer
      };
  });
};

export const fetchSectorSummary = async (symbols?: string[]): Promise<SectorSummary[]> => {
  return measurePerformance('fetchSectorSummary', async () => {
    if (!symbols || symbols.length === 0) {
      return [];
    }

      const stocks = await fetchPortfolioStocks(symbols);
      
      // Group stocks by sector and calculate summaries
      const sectorMap = new Map();
      
      stocks.forEach(stock => {
        const sector = stock.sector || 'Unknown';
        if (!sectorMap.has(sector)) {
          sectorMap.set(sector, {
          sectorName: sector,
            totalInvestment: 0,
            totalPresentValue: 0,
            totalGainLoss: 0,
            stockCount: 0,
            stocks: []
          });
        }
        
        const sectorData = sectorMap.get(sector);
        sectorData.totalInvestment += stock.investment || 0;
        sectorData.totalPresentValue += stock.presentValue || 0;
        sectorData.totalGainLoss += stock.gainLoss || 0;
        sectorData.stockCount += 1;
        sectorData.stocks.push(stock);
      });
      
      // Calculate percentages and convert to array
      const sectorSummary = Array.from(sectorMap.values()).map(sector => ({
        ...sector,
        totalGainLossPercentage: sector.totalInvestment > 0 ? (sector.totalGainLoss / sector.totalInvestment) * 100 : 0,
        portfolioPercentage: stocks.reduce((sum, stock) => sum + (stock.investment || 0), 0) > 0 ? 
          (sector.totalInvestment / stocks.reduce((sum, stock) => sum + (stock.investment || 0), 0)) * 100 : 0
      }));
      
      return sectorSummary;
  });
};

// Add other API calls as needed (e.g., for individual stock updates, auth, etc.)
export const fetchStockPrice = async (symbol: string) => {
  return measurePerformance('fetchStockPrice', async () => {
    return retryWithBackoff(async () => {
      const response = await enhancedFetch(`${API_BASE_URL}/api/stocks/quote/${symbol}`);
    const data = await response.json();
      return data;
    });
  });
};

export const fetchComprehensiveStockData = async (symbol: string) => {
  return measurePerformance('fetchComprehensiveStockData', async () => {
    return retryWithBackoff(async () => {
      const response = await enhancedFetch(`${API_BASE_URL}/api/stocks/overview/${symbol}`);
    const data = await response.json();
      return data;
    });
  });
};

export const bulkUpdateStocks = async () => {
  return measurePerformance('bulkUpdateStocks', async () => {
    return retryWithBackoff(async () => {
      const response = await enhancedFetch(`${API_BASE_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbols: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'JPM', 'JNJ']
        })
      });
      const data = await response.json();
      return data;
    });
  });
};
