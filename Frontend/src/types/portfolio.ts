export interface PortfolioStock {
  no: number;
  particulars: string;
  purchasePrice: number;
  quantity: number;
  investment: number;
  portfolioPercentage: number;
  exchange: 'NSE' | 'BSE';
  sector: string;
  // Real-time data
  cmp: number;
  presentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  // Financial metrics
  marketCap: number;
  peRatio: number;
  latestEarnings: number;
  revenue: number;
  ebitda: number;
  ebitdaPercentage: number;
  pat: number;
  patPercentage: number;
  cfo: number;
  cfo5Years: number;
  freeCashFlow5Years: number;
  debtToEquity: number;
  bookValue: number;
  // Growth metrics (3 years)
  revenueGrowth: number;
  ebitdaGrowth: number;
  profitGrowth: number;
  marketCapGrowth: number;
  priceToSales: number;
  cfoToEbitda: number;
  cfoToPat: number;
  priceToBook: number;
  stage2: string;
  salePrice: number;
  abhishek: string;
}

export interface SectorSummary {
  sectorName: string;
  totalInvestment: number;
  totalPresentValue: number;
  totalGainLoss: number;
  stockCount: number;
  portfolioPercentage: number;
}

export interface PortfolioSummary {
  totalInvestment: number;
  totalPresentValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  bestPerformer: string;
  worstPerformer: string;
}