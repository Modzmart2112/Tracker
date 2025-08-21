import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Zap, Shield, Globe2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/logo_flat_1755739978297.png";

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
    <header className="bg-gradient-to-br from-black via-gray-900 to-black text-white shadow-2xl">
      <div className="relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#CB0000]/10 via-gray-800/10 to-[#CB0000]/10 animate-pulse" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-[#CB0000]/20 via-transparent to-gray-800/20" />
        </div>
        
        <div className="relative px-8 py-8">
          {/* Top row with branding and actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <img 
                src={logoImage} 
                alt="Sydney Tools" 
                className="h-6 w-auto filter drop-shadow-lg"
              />
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Status indicators */}
              <div className="flex items-center space-x-6 mr-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#CB0000] rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400">System Online</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield size={16} className="text-[#CB0000]" />
                  <span className="text-xs text-gray-400">Secure</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe2 size={16} className="text-gray-400" />
                  <span className="text-xs text-gray-400">Global Coverage</span>
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
                    className="bg-gradient-to-r from-[#CB0000] to-red-800 hover:from-red-700 hover:to-red-900 text-white border-0 shadow-lg"
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
                <nav className="flex items-center space-x-2 text-xs text-[#CB0000] mb-2">
                  {breadcrumbs.map((crumb, index) => (
                    <span key={index} className="flex items-center">
                      {index > 0 && <span className="mx-2 text-gray-600">›</span>}
                      <span className={index === breadcrumbs.length - 1 ? "text-white font-medium" : "text-gray-400"}>
                        {crumb.label}
                      </span>
                    </span>
                  ))}
                </nav>
              )}
              <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
              {subtitle && (
                <p className="text-gray-400">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Zap size={14} className="text-[#CB0000]" />
              <span>Real-time updates enabled</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
