import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/header";
import { Navbar } from "@/components/layout/navbar";
import Dashboard from "@/pages/dashboard";
import Competitors from "@/pages/competitors";
import Changes from "@/pages/changes";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import ProductsPage from "@/pages/products-new";

function Router() {
  const [location] = useLocation();
  
  // Determine page title and subtitle based on route
  const getPageInfo = () => {
    switch(location) {
      case '/':
        return { title: 'Competitor Overview', subtitle: 'Real-time monitoring of all competitors and market dynamics' };
      case '/products':
        return { title: 'Product Management', subtitle: 'Add products and track competitor prices' };
      case '/competitors':
        return { title: 'Competitors Management', subtitle: 'Manage competitor websites and monitoring' };
      case '/changes':
        return { title: 'Recent Changes', subtitle: 'Track price and stock updates across all competitors' };
      case '/admin':
        return { title: 'Administration', subtitle: 'Manage system configuration and data' };
      default:
        return { title: 'Page Not Found', subtitle: 'The requested page could not be found' };
    }
  };
  
  const { title, subtitle } = getPageInfo();
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header 
        title={title}
        subtitle={subtitle}
        showActions={location === '/products'}
      />
      <Navbar />
      <div className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/products" component={ProductsPage} />
          <Route path="/competitors" component={Competitors} />
          <Route path="/changes" component={Changes} />
          <Route path="/admin" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
