import { PortfolioStock, SectorSummary } from '@/types/portfolio';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

interface SectorSummaryProps {
  stocks: PortfolioStock[];
}

export const SectorSummaryComponent = ({ stocks }: SectorSummaryProps) => {
  const getSectorSummary = (): SectorSummary[] => {
    const sectors = stocks.reduce((acc, stock) => {
      if (!acc[stock.sector]) {
        acc[stock.sector] = {
          sectorName: stock.sector,
          totalInvestment: 0,
          totalPresentValue: 0,
          totalGainLoss: 0,
          stockCount: 0,
          portfolioPercentage: 0
        };
      }
      
      acc[stock.sector].totalInvestment += stock.investment;
      acc[stock.sector].totalPresentValue += stock.presentValue;
      acc[stock.sector].totalGainLoss += stock.gainLoss;
      acc[stock.sector].stockCount += 1;
      acc[stock.sector].portfolioPercentage += stock.portfolioPercentage;
      
      return acc;
    }, {} as Record<string, SectorSummary>);
    
    return Object.values(sectors);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getGainLossPercentage = (gainLoss: number, investment: number) => {
    return (gainLoss / investment) * 100;
  };

  const sectors = getSectorSummary();
  const totalPortfolioValue = sectors.reduce((sum, sector) => sum + sector.totalPresentValue, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sectors.map((sector) => (
        <Card key={sector.sectorName} className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 group hover:shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {sector.sectorName}
              </h3>
              <Badge variant="secondary" className="text-xs bg-muted/50 backdrop-blur-sm">
                {sector.stockCount} stocks
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="metric-label">Investment</span>
                <span className="font-mono font-semibold text-foreground">{formatCurrency(sector.totalInvestment)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="metric-label">Present Value</span>
                <span className="font-mono font-semibold text-foreground">{formatCurrency(sector.totalPresentValue)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="metric-label">Gain/Loss</span>
                <div className="text-right">
                  <span className={`font-mono font-semibold ${sector.totalGainLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {sector.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(sector.totalGainLoss))}
                  </span>
                  <div className={`text-xs font-medium ${sector.totalGainLoss >= 0 ? 'text-profit/80' : 'text-loss/80'}`}>
                    ({formatPercentage(getGainLossPercentage(sector.totalGainLoss, sector.totalInvestment))})
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-border/50">
                <span className="metric-label">Portfolio Weight</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((sector.totalPresentValue / totalPortfolioValue) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="font-mono font-semibold text-primary text-sm">
                    {sector.portfolioPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};