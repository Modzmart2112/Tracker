import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/header";
import { Navbar } from "@/components/layout/navbar";
import Dashboard from "@/pages/dashboard";
import Categories from "@/pages/categories";
import Products from "@/pages/products";
import Competitors from "@/pages/competitors";
import Pages from "@/pages/pages";
import Changes from "@/pages/changes";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { CatalogPage } from "@/pages/catalog";
import { CatalogManagerPage } from "@/pages/catalog-manager";

function Router() {
  const [location] = useLocation();
  
  // Determine page title and subtitle based on route
  const getPageInfo = () => {
    switch(location) {
      case '/':
        return { title: 'Competitor Overview', subtitle: 'Real-time monitoring of all competitors and market dynamics' };
      case '/categories':
        return { title: 'Categories Explorer', subtitle: 'Browse product categories and types' };
      case '/products':
        return { title: 'Product Catalog', subtitle: 'Complete inventory across all competitors and categories' };
      case '/competitors':
        return { title: 'Competitors Management', subtitle: 'Manage competitor websites and monitoring' };
      case '/pages':
        return { title: 'Pages & Scraping', subtitle: 'Manage scraping pages and monitor extraction tasks' };
      case '/changes':
        return { title: 'Recent Changes', subtitle: 'Track price and stock updates across all competitors' };
      case '/admin':
        return { title: 'Administration', subtitle: 'Manage system configuration and data' };
      case '/catalog':
        return { title: 'Product Catalog', subtitle: 'Manage your product catalog and brands' };
      case '/catalog-manager':
        return { title: 'Catalog Manager', subtitle: 'Manage categories, product types, and competitors' };
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
          <Route path="/categories" component={Categories} />
          <Route path="/products" component={Products} />
          <Route path="/competitors" component={Competitors} />
          <Route path="/pages" component={Pages} />
          <Route path="/changes" component={Changes} />
          <Route path="/admin" component={Admin} />
          <Route path="/catalog" component={CatalogPage} />
          <Route path="/catalog-manager" component={CatalogManagerPage} />
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
