import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
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
    <header className="bg-white border-b border-slate-200 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-2">
              {breadcrumbs.map((crumb, index) => (
                <span key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2">›</span>}
                  <span className={index === breadcrumbs.length - 1 ? "text-slate-900 font-medium" : ""}>
                    {crumb.label}
                  </span>
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-slate-600 mt-1">{subtitle}</p>
          )}
        </div>
        {showActions && (
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button 
              onClick={handleRunScrape}
              disabled={runScrapeMutation.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${runScrapeMutation.isPending ? 'animate-spin' : ''}`} />
              {runScrapeMutation.isPending ? 'Scraping...' : 'Run Scrape'}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
