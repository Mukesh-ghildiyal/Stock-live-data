import { useState, useEffect } from 'react';
import { PortfolioStock } from '@/types/portfolio';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioTableProps {
  stocks: PortfolioStock[];
  onStocksUpdate?: (stocks: PortfolioStock[]) => void;
}

export const PortfolioTable = ({ stocks, onStocksUpdate }: PortfolioTableProps) => {
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number | undefined) => {
    if (percentage === undefined || percentage === null) return 'N/A';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const formatNumber = (value: number | undefined, decimals: number = 1) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(decimals);
  };

  const getGainLossClass = (gainLoss: number | undefined) => {
    if (gainLoss === undefined || gainLoss === null) return 'text-neutral';
    if (gainLoss > 0) return 'text-profit';
    if (gainLoss < 0) return 'text-loss';
    return 'text-neutral';
  };

  const getUpdateClass = (gainLoss: number | undefined) => {
    if (gainLoss === undefined || gainLoss === null) return '';
    if (gainLoss > 0) return 'hover-scale';
    if (gainLoss < 0) return 'hover-scale';
    return '';
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdateTime(new Date());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 shadow-xl animate-fade-in">
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-table-header/50 to-table-header/30 backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Portfolio Holdings</h2>
            <p className="text-muted-foreground text-sm">
              Comprehensive view of your investment portfolio with real-time updates
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-muted/50 backdrop-blur-sm border-border/50 hover-scale">
              Last Updated: {lastUpdateTime.toLocaleTimeString()}
            </Badge>
            <div className="flex items-center gap-2 px-3 py-1 bg-profit/10 rounded-full transition-all duration-300 hover:bg-profit/20">
              <div className="w-2 h-2 bg-profit rounded-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
              <span className="text-sm text-profit font-medium">Live Updates</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th className="sticky left-0 bg-table-header z-10">No</th>
              <th className="sticky left-12 bg-table-header z-10 min-w-[200px]">Particulars</th>
              <th>Purchase Price</th>
              <th>Qty</th>
              <th>Investment</th>
              <th>Portfolio %</th>
              <th>Exchange</th>
              <th>Sector</th>
              <th className="bg-metric-highlight/10">CMP</th>
              <th className="bg-metric-highlight/10">Present Value</th>
              <th className="bg-metric-highlight/10">Gain/Loss</th>
              <th className="bg-metric-highlight/10">Gain/Loss %</th>
              <th>Market Cap</th>
              <th>P/E (TTM)</th>
              <th>Latest Earnings</th>
              <th>Revenue (TTM)</th>
              <th>EBITDA (TTM)</th>
              <th>EBITDA %</th>
              <th>PAT</th>
              <th>PAT %</th>
              <th>CFO (March 24)</th>
              <th>CFO (5 years)</th>
              <th>Free Cash Flow</th>
              <th>Debt to Equity</th>
              <th>Book Value</th>
              <th>Revenue Growth</th>
              <th>EBITDA Growth</th>
              <th>Profit Growth</th>
              <th>Market Cap Growth</th>
              <th>Price to Sales</th>
              <th>CFO to EBITDA</th>
              <th>CFO to PAT</th>
              <th>Price to Book</th>
              <th>Stage-2</th>
              <th>Sale Price</th>
              <th>Abhishek</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, index) => (
              <tr key={stock.no || index} className={`${index % 2 === 0 ? 'bg-table-row' : 'bg-background'} hover:bg-muted/30 transition-colors duration-200`}>
                <td className="sticky left-0 bg-inherit z-10 font-mono font-bold">
                  {stock.no || index + 1}
                </td>
                <td className="sticky left-12 bg-inherit z-10 font-semibold">
                  <div className="flex flex-col">
                    <span className="text-foreground">{stock.particulars || 'N/A'}</span>
                    <Badge variant="secondary" className="w-fit mt-1 text-xs hover-scale">
                      {stock.sector || 'Unknown'}
                    </Badge>
                  </div>
                </td>
                <td className="metric-value">{formatCurrency(stock.purchasePrice)}</td>
                <td className="metric-value">{stock.quantity || 0}</td>
                <td className="metric-value">{formatCurrency(stock.investment)}</td>
                <td className="metric-value">{formatNumber(stock.portfolioPercentage, 1)}%</td>
                <td>
                  <Badge variant={stock.exchange === 'NSE' ? 'default' : 'secondary'}>
                    {stock.exchange || 'N/A'}
                  </Badge>
                </td>
                <td>
                  <Badge variant="outline">{stock.sector || 'Unknown'}</Badge>
                </td>
                <td className={`metric-value font-bold bg-metric-highlight/5 ${getUpdateClass(stock.gainLoss)} transition-all duration-300`}>
                  {formatCurrency(stock.cmp)}
                </td>
                <td className={`metric-value font-bold bg-metric-highlight/5 ${getUpdateClass(stock.gainLoss)} transition-all duration-300`}>
                  {formatCurrency(stock.presentValue)}
                </td>
                <td className={`metric-value font-bold ${getGainLossClass(stock.gainLoss)} bg-metric-highlight/5 transition-all duration-300`}>
                  <div className="flex items-center gap-1 hover-scale">
                    {stock.gainLoss && stock.gainLoss > 0 ? <TrendingUp className="w-4 h-4 animate-fade-in" /> : <TrendingDown className="w-4 h-4 animate-fade-in" />}
                    {formatCurrency(Math.abs(stock.gainLoss || 0))}
                  </div>
                </td>
                <td className={`metric-value font-bold ${getGainLossClass(stock.gainLoss)} bg-metric-highlight/5 transition-all duration-300`}>
                  {formatPercentage(stock.gainLossPercentage)}
                </td>
                <td className="metric-value">{formatCurrency(stock.marketCap)}</td>
                <td className="metric-value">{formatNumber(stock.peRatio, 1)}</td>
                <td className="metric-value">{formatCurrency(stock.latestEarnings)}</td>
                <td className="metric-value">{formatCurrency(stock.revenue)}</td>
                <td className="metric-value">{stock.ebitda ? formatCurrency(stock.ebitda) : 'N/A'}</td>
                <td className="metric-value">{stock.ebitdaPercentage ? `${formatNumber(stock.ebitdaPercentage, 1)}%` : 'N/A'}</td>
                <td className="metric-value">{formatCurrency(stock.pat)}</td>
                <td className="metric-value">{formatNumber(stock.patPercentage, 1)}%</td>
                <td className="metric-value">{stock.cfo ? formatCurrency(stock.cfo) : 'N/A'}</td>
                <td className="metric-value">{stock.cfo5Years ? formatCurrency(stock.cfo5Years) : 'N/A'}</td>
                <td className="metric-value">{stock.freeCashFlow5Years ? formatCurrency(stock.freeCashFlow5Years) : 'N/A'}</td>
                <td className="metric-value">{stock.debtToEquity ? formatNumber(stock.debtToEquity, 2) : 'N/A'}</td>
                <td className="metric-value">{formatCurrency(stock.bookValue)}</td>
                <td className="metric-value text-profit">{formatPercentage(stock.revenueGrowth)}</td>
                <td className="metric-value text-profit">{stock.ebitdaGrowth ? formatPercentage(stock.ebitdaGrowth) : 'N/A'}</td>
                <td className="metric-value text-profit">{formatPercentage(stock.profitGrowth)}</td>
                <td className="metric-value text-profit">{formatPercentage(stock.marketCapGrowth)}</td>
                <td className="metric-value">{formatNumber(stock.priceToSales, 2)}</td>
                <td className="metric-value">{stock.cfoToEbitda ? formatNumber(stock.cfoToEbitda, 2) : 'N/A'}</td>
                <td className="metric-value">{stock.cfoToPat ? formatNumber(stock.cfoToPat, 2) : 'N/A'}</td>
                <td className="metric-value">{formatNumber(stock.priceToBook, 2)}</td>
                <td>
                  <Badge 
                    variant={stock.stage2 === 'Strong Buy' ? 'default' : stock.stage2 === 'Buy' ? 'secondary' : 'outline'}
                    className={stock.stage2 && stock.stage2.includes('Buy') ? 'bg-profit text-profit-foreground' : ''}
                  >
                    {stock.stage2 || 'N/A'}
                  </Badge>
                </td>
                <td className="metric-value">{formatCurrency(stock.salePrice)}</td>
                <td>
                  <Badge 
                    variant={stock.abhishek === 'Strong Buy' ? 'default' : stock.abhishek === 'Buy' ? 'secondary' : 'outline'}
                    className={stock.abhishek && stock.abhishek.includes('Buy') ? 'bg-profit text-profit-foreground' : ''}
                  >
                    {stock.abhishek || 'N/A'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};