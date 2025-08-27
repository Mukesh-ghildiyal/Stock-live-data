import { useEffect, useState, useCallback, useRef } from 'react';
import { PortfolioStock } from '@/types/portfolio';
import { PortfolioTable } from '@/components/PortfolioTable';
import { SectorSummaryComponent } from '@/components/SectorSummary';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { LiveIndicator } from '@/components/LiveIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster } from '@/components/ui/sonner';
import { TrendingUp, BarChart3, Eye, Zap, RefreshCw } from 'lucide-react';
import { fetchPortfolioStocks, fetchPortfolioSummary, fetchSectorSummary } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

// Real stock symbols for live data
const LIVE_STOCK_SYMBOLS = [
  'AAPL',     // Apple Inc.
  'GOOGL',    // Alphabet Inc. (Google)
  'MSFT',     // Microsoft Corporation
  'AMZN',     // Amazon.com Inc.
  'TSLA',     // Tesla Inc.
  'META',     // Meta Platforms Inc. (Facebook)
  'NVDA',     // NVIDIA Corporation
  'NFLX',     // Netflix Inc.
  'JPM',      // JPMorgan Chase & Co.
  'JNJ'       // Johnson & Johnson
];

// Performance monitoring
const REFRESH_INTERVAL = 30000; // 30 seconds instead of 15 for better performance
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

const Index = () => {
  const [stocks, setStocks] = useState<PortfolioStock[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<any>(null);
  const [sectorSummaries, setSectorSummaries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  
  // Refs for performance tracking
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const fetchData = useCallback(async (isRetry = false) => {
    if (isRefreshing && !isRetry) return; // Prevent concurrent requests
    
    setIsRefreshing(true);
    const fetchStartTime = performance.now();
    
    try {
      // Fetch live scraped data from backend
      const fetchedStocks = await fetchPortfolioStocks(LIVE_STOCK_SYMBOLS);
      setStocks(fetchedStocks);
      
      const summary = await fetchPortfolioSummary(LIVE_STOCK_SYMBOLS);
      setPortfolioSummary(summary);
      
      const sectors = await fetchSectorSummary(LIVE_STOCK_SYMBOLS);
      setSectorSummaries(sectors);
      
      setIsBackendConnected(true);
      setLastUpdateTime(new Date());
      setUpdateCount(prev => prev + 1);
      setErrorCount(0); // Reset error count on success
      
      const fetchDuration = performance.now() - fetchStartTime;
      
      toast({
        title: "Live Data Updated",
        description: `Successfully fetched real-time data for ${fetchedStocks.length} stocks in ${fetchDuration.toFixed(0)}ms.`,
        duration: 3000,
      });
      
      // Log performance metrics
      console.log(`Data fetch completed in ${fetchDuration.toFixed(2)}ms`);
      
    } catch (error) {
      console.error("Failed to fetch live data:", error);
      setStocks([]);
      setPortfolioSummary(null);
      setSectorSummaries([]);
      setIsBackendConnected(false);
      setErrorCount(prev => prev + 1);
      
      const fetchDuration = performance.now() - fetchStartTime;
      
      toast({
        title: "Backend Connection Failed",
        description: `Could not connect to backend after ${fetchDuration.toFixed(0)}ms. Please ensure backend is running on port 3001.`,
        variant: "destructive",
        duration: 5000,
      });
      
      // Log error metrics
      console.error(`Data fetch failed after ${fetchDuration.toFixed(2)}ms:`, error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [isRefreshing, toast]);

  const retryConnection = useCallback(async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    retryTimeoutRef.current = setTimeout(() => {
      fetchData(true);
    }, RETRY_DELAY);
  }, [fetchData]);

  const manualRefresh = useCallback(() => {
    if (isRefreshing) return;
    fetchData();
  }, [fetchData, isRefreshing]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up interval for automatic updates
    intervalRef.current = setInterval(() => {
      if (isBackendConnected) {
        fetchData();
      }
    }, REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchData, isBackendConnected]);

  // Performance metrics
  const uptime = Date.now() - startTimeRef.current;
  const uptimeMinutes = Math.floor(uptime / 60000);
  const successRate = updateCount > 0 ? ((updateCount - errorCount) / updateCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header with gradient background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-border/50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        
        <div className="relative container mx-auto px-6 py-12">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl backdrop-blur-sm border border-primary/20">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <h1 className="financial-title text-5xl">
                  Portfolio Dashboard
                </h1>
              </div>
              <p className="text-muted-foreground text-xl max-w-2xl leading-relaxed">
                Professional portfolio management with real-time market data scraped from Yahoo Finance and Google Finance.
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>Live Market Data</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="w-4 h-4" />
                  <span>Web Scraping</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  <span>Real-time Updates</span>
                </div>
                <LiveIndicator />
              </div>
              
              {/* Data Status and Performance Metrics */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isBackendConnected 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}>
                  {isBackendConnected ? '🔄 Live Data Connected' : '❌ Backend Disconnected'}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{LIVE_STOCK_SYMBOLS.length} stocks • Updates every {REFRESH_INTERVAL / 1000}s</span>
                </div>
                
                {lastUpdateTime && (
                  <div className="text-sm text-muted-foreground">
                    Last update: {lastUpdateTime.toLocaleTimeString()}
                  </div>
                )}
                
                {/* Performance Metrics */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Updates: {updateCount}</span>
                  <span>Errors: {errorCount}</span>
                  <span>Success Rate: {successRate.toFixed(1)}%</span>
                  <span>Uptime: {uptimeMinutes}m</span>
                </div>
                
                {/* Manual Refresh Button */}
                <button
                  onClick={manualRefresh}
                  disabled={isRefreshing}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    isRefreshing 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Fetching live data from Yahoo Finance and Google Finance...
              </p>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && stocks.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground mb-4">
                Unable to fetch stock data. Please check your backend connection.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => fetchData()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Retry Connection
                </button>
                <button
                  onClick={retryConnection}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
                >
                  Retry in {RETRY_DELAY / 1000}s
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Summary */}
        {!isLoading && stocks.length > 0 && (
          <div className="space-y-6">
            <h2 className="section-title">Portfolio Overview</h2>
            <PortfolioSummary stocks={stocks} />
          </div>
        )}

        {/* Sector Analysis */}
        {!isLoading && stocks.length > 0 && (
          <div className="space-y-6">
            <h2 className="section-title">Sector Analysis</h2>
            <SectorSummaryComponent stocks={stocks} />
          </div>
        )}

        {/* Holdings Table */}
        {!isLoading && stocks.length > 0 && (
          <div className="space-y-6">
            <h2 className="section-title">Portfolio Holdings</h2>
            <PortfolioTable stocks={stocks} onStocksUpdate={setStocks} />
          </div>
        )}
      </div>
      
      <Toaster />
    </div>
  );
};

export default Index;