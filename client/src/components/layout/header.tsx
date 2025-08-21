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
    <header className="bg-gradient-to-br from-black via-red-900 to-black text-white shadow-2xl">
      <div className="relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-black/10 to-red-600/10 animate-pulse" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-transparent to-black/20" />
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
              <div className="flex items-center bg-black/40 backdrop-blur-sm border border-red-800 rounded-lg px-4 py-2 space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-white font-medium">Online</span>
                </div>
                <div className="h-4 w-px bg-red-700" />
                <div className="flex items-center space-x-2">
                  <Shield size={14} className="text-red-500" />
                  <span className="text-xs text-white font-medium">Secure</span>
                </div>
                <div className="h-4 w-px bg-red-700" />
                <div className="flex items-center space-x-2">
                  <Globe2 size={14} className="text-white" />
                  <span className="text-xs text-white font-medium">Global</span>
                </div>
              </div>
              
              {showActions && (
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={handleExportCSV}
                    className="bg-black/20 border-red-600/50 text-white hover:bg-red-900/30 backdrop-blur-sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                  <Button 
                    onClick={handleRunScrape}
                    disabled={runScrapeMutation.isPending}
                    className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white border-0 shadow-lg"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${runScrapeMutation.isPending ? 'animate-spin' : ''}`} />
                    {runScrapeMutation.isPending ? 'Scanning...' : 'Run Scan'}
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          
        </div>
      </div>
    </header>
  );
}
