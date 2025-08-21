import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/navbar";
import Dashboard from "@/pages/dashboard";
import Categories from "@/pages/categories";
import Products from "@/pages/products";
import Competitors from "@/pages/competitors";
import Pages from "@/pages/pages";
import Changes from "@/pages/changes";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="page-transition">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/categories" component={Categories} />
          <Route path="/products" component={Products} />
          <Route path="/competitors" component={Competitors} />
          <Route path="/pages" component={Pages} />
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
