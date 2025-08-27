import { PortfolioStock } from '@/types/portfolio';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Target, Award, AlertTriangle } from 'lucide-react';

interface PortfolioSummaryProps {
  stocks: PortfolioStock[];
}

export const PortfolioSummary = ({ stocks }: PortfolioSummaryProps) => {
  // Handle empty stocks array
  if (!stocks || stocks.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="metric-label">Total Investment</p>
              <p className="text-3xl font-bold text-foreground">₹0</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="metric-label">Present Value</p>
              <p className="text-3xl font-bold text-foreground">₹0</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="metric-label">Total Return</p>
              <p className="text-3xl font-bold text-foreground">₹0</p>
              <p className="text-sm font-medium text-muted-foreground">+0.00%</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-muted/20 to-muted/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="metric-label">Best Performer</p>
              <p className="text-lg font-bold text-muted-foreground">No Data</p>
              <p className="text-sm font-medium text-muted-foreground">+0.00%</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-muted/20 to-muted/10 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const totalInvestment = stocks.reduce((sum, stock) => sum + stock.investment, 0);
  const totalPresentValue = stocks.reduce((sum, stock) => sum + stock.presentValue, 0);
  const totalGainLoss = totalPresentValue - totalInvestment;
  const totalGainLossPercentage = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

  const bestPerformer = stocks.reduce((best, current) => 
    current.gainLossPercentage > best.gainLossPercentage ? current : best, stocks[0]
  );
  
  const worstPerformer = stocks.reduce((worst, current) => 
    current.gainLossPercentage < worst.gainLossPercentage ? current : worst, stocks[0]
  );

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-500 group hover:shadow-2xl hover:-translate-y-1 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="metric-label">Total Investment</p>
            <p className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
              {formatCurrency(totalInvestment)}
            </p>
          </div>
          <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3">
            <TrendingUp className="w-6 h-6 text-primary transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-500 group hover:shadow-2xl hover:-translate-y-1 animate-scale-in [animation-delay:100ms]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="metric-label">Present Value</p>
            <p className="text-3xl font-bold text-foreground group-hover:text-accent transition-colors duration-300">
              {formatCurrency(totalPresentValue)}
            </p>
          </div>
          <div className="p-3 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3">
            <DollarSign className="w-6 h-6 text-accent transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-500 group hover:shadow-2xl hover:-translate-y-1 animate-scale-in [animation-delay:200ms]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="metric-label">Total Return</p>
            <p className={`text-3xl font-bold transition-colors duration-300 ${totalGainLoss >= 0 ? 'text-profit group-hover:text-profit' : 'text-loss group-hover:text-loss'}`}>
              {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(totalGainLoss))}
            </p>
            <p className={`text-sm font-medium ${totalGainLoss >= 0 ? 'text-profit/80' : 'text-loss/80'}`}>
              {formatPercentage(totalGainLossPercentage)}
            </p>
          </div>
          <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3 ${totalGainLoss >= 0 ? 'bg-gradient-to-br from-profit/20 to-profit/10' : 'bg-gradient-to-br from-loss/20 to-loss/10'}`}>
            {totalGainLoss >= 0 ? 
              <TrendingUp className="w-6 h-6 text-profit transition-transform duration-300 group-hover:scale-110" /> : 
              <TrendingDown className="w-6 h-6 text-loss transition-transform duration-300 group-hover:scale-110" />
            }
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-500 group hover:shadow-2xl hover:-translate-y-1 animate-scale-in [animation-delay:300ms]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="metric-label">Best Performer</p>
            <p className="text-lg font-bold text-foreground group-hover:text-profit transition-colors duration-300">
              {bestPerformer.particulars}
            </p>
            <p className="text-sm font-medium text-profit">
              {formatPercentage(bestPerformer.gainLossPercentage)}
            </p>
          </div>
          <div className="p-3 bg-gradient-to-br from-profit/20 to-profit/10 rounded-xl group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3">
            <TrendingUp className="w-6 h-6 text-profit transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>
      </Card>
    </div>
  );
};