import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Zap, Shield, Globe2, TrendingUp } from "lucide-react";
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
    <header className="bg-black text-white border-b border-[#CB0000]/20">
      <div className="relative overflow-hidden">
        {/* Tech pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-[#CB0000]/10 via-transparent to-[#CB0000]/10" />
        </div>

        <div className="relative px-8 py-6">
          {/* Main header row */}
          <div className="flex items-center justify-between">
            {/* Left section with logo */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#CB0000] to-red-800 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative bg-black/50 backdrop-blur-sm border border-[#CB0000]/30 p-2 rounded-lg">
                    <img 
                      src={logoImage} 
                      alt="Sydney Tools" 
                      className="h-5 w-auto filter brightness-0 invert opacity-90"
                    />
                  </div>
                </div>
                <div className="h-12 w-px bg-gradient-to-b from-transparent via-[#CB0000]/30 to-transparent" />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right section with status and actions */}
            <div className="flex items-center space-x-4">
              {/* Status indicators */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-black/30 backdrop-blur-sm border border-gray-700 rounded-full">
                <div className="w-1.5 h-1.5 bg-[#CB0000] rounded-full animate-pulse" />
                <span className="text-xs text-gray-300 font-medium">LIVE</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-black/30 backdrop-blur-sm border border-gray-700 rounded-full">
                <Shield size={12} className="text-[#CB0000]" />
                <span className="text-xs text-gray-300 font-medium">SECURE</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-black/30 backdrop-blur-sm border border-gray-700 rounded-full">
                <Globe2 size={12} className="text-gray-400" />
                <span className="text-xs text-gray-300 font-medium">GLOBAL</span>
              </div>
            

              {showActions && (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    onClick={handleExportCSV}
                    className="bg-black/30 backdrop-blur-sm border border-gray-700 text-gray-300 hover:bg-black/50 hover:text-white hover:border-[#CB0000]/50 transition-all duration-200 px-3 py-1.5 h-auto text-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export
                  </Button>
                  <Button 
                    onClick={handleRunScrape}
                    disabled={runScrapeMutation.isPending}
                    className="bg-gradient-to-r from-[#CB0000] to-red-800 hover:from-red-700 hover:to-red-900 text-white border-0 shadow-lg transition-all duration-200 px-3 py-1.5 h-auto text-xs"
                  >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${runScrapeMutation.isPending ? 'animate-spin' : ''}`} />
                    {runScrapeMutation.isPending ? 'Scanning...' : 'Scan'}
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