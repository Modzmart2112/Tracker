import { Button } from "@/components/ui/button";
import { Download, RefreshCw, ChartLine, Zap, Shield, Globe2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  showActions?: boolean;
  onExportCSV?: () => void;
  onRunScrape?: () => void;
}

export function Header({ 
  title, 
  subtitle, 
  breadcrumbs = [], 
  showActions = true,
  onExportCSV,
  onRunScrape 
}: HeaderProps) {
  const { toast } = useToast();

  const runScrapeMutation = useMutation({
    mutationFn: () => api.runScrape({}),
    onSuccess: () => {
      toast({
        title: "Scraping Started",
        description: "Scraping tasks have been queued successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start scraping tasks.",
        variant: "destructive",
      });
    },
  });

  const handleRunScrape = () => {
    if (onRunScrape) {
      onRunScrape();
    } else {
      runScrapeMutation.mutate();
    }
  };

  const handleExportCSV = () => {
    if (onExportCSV) {
      onExportCSV();
    } else {
      api.exportCSV();
    }
  };

  return (
    <header className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl">
      <div className="relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 animate-pulse" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-blue-500/20" />
        </div>
        
        <div className="relative px-8 py-8">
          {/* Top row with branding and actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-lg blur-md opacity-50 animate-pulse" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                  <ChartLine className="text-white" size={24} />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  CompetitorScope
                </h1>
                <p className="text-xs text-cyan-400 font-medium tracking-wider uppercase">
                  Competitive Intelligence Platform
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Status indicators */}
              <div className="flex items-center space-x-6 mr-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-slate-400">System Online</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield size={16} className="text-cyan-400" />
                  <span className="text-xs text-slate-400">Secure</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe2 size={16} className="text-blue-400" />
                  <span className="text-xs text-slate-400">Global Coverage</span>
                </div>
              </div>
              
              {showActions && (
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={handleExportCSV}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                  <Button 
                    onClick={handleRunScrape}
                    disabled={runScrapeMutation.isPending}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 shadow-lg"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${runScrapeMutation.isPending ? 'animate-spin' : ''}`} />
                    {runScrapeMutation.isPending ? 'Scanning...' : 'Run Scan'}
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Page title and subtitle */}
          <div className="flex items-end justify-between">
            <div>
              {breadcrumbs.length > 0 && (
                <nav className="flex items-center space-x-2 text-xs text-cyan-400 mb-2">
                  {breadcrumbs.map((crumb, index) => (
                    <span key={index} className="flex items-center">
                      {index > 0 && <span className="mx-2 text-slate-600">›</span>}
                      <span className={index === breadcrumbs.length - 1 ? "text-white font-medium" : "text-slate-400"}>
                        {crumb.label}
                      </span>
                    </span>
                  ))}
                </nav>
              )}
              <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
              {subtitle && (
                <p className="text-slate-400">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Zap size={14} className="text-yellow-400" />
              <span>Real-time updates enabled</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
