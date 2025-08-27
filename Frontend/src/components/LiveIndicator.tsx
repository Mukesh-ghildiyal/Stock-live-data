import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export const LiveIndicator = () => {
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // Simulate occasional connection issues
      if (Math.random() < 0.05) {
        setIsLive(false);
        setTimeout(() => setIsLive(true), 2000);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4 animate-scale-in">
      <Badge 
        variant={isLive ? "default" : "destructive"}
        className={`${isLive ? 'bg-profit text-profit-foreground' : 'bg-loss text-loss-foreground'} transition-all duration-500 hover-scale ${isLive ? 'animate-fade-in' : 'animate-fade-out'}`}
      >
        {isLive ? (
          <>
            <Wifi className="w-3 h-3 mr-1 transition-transform duration-300" />
            Live
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 mr-1 transition-transform duration-300" />
            Disconnected
          </>
        )}
      </Badge>
      
      <div className="text-sm text-muted-foreground transition-opacity duration-300">
        Last Update: {lastUpdate.toLocaleTimeString()}
      </div>
      
      {isLive && (
        <div className="flex items-center gap-2 animate-fade-in">
          <div className="w-2 h-2 bg-profit rounded-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
          <span className="text-xs text-muted-foreground">Auto-refresh every 15s</span>
        </div>
      )}
    </div>
  );
};