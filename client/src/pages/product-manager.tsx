import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Globe, 
  Tag, 
  DollarSign,
  Link2,
  Sparkles,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Package
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Competitor {
  id: string;
  name: string;
  domain: string;
}

interface ProductListing {
  id: string;
  productId: string;
  competitorId: string;
  url: string;
  title: string | null;
  currentPrice: number | null;
  lastScraped: string | null;
  priceChange: number | null;
  status: 'pending' | 'active' | 'error';
  competitor?: Competitor;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  targetPrice: number | null;
  listings: ProductListing[];
}

export function ProductManagerPage() {
  const { toast } = useToast();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProductData, setNewProductData] = useState({
    sku: "",
    name: "",
    targetPrice: ""
  });
  const [newCompetitor, setNewCompetitor] = useState({
    name: "",
    domain: ""
  });
  const [newListingUrl, setNewListingUrl] = useState("");
  const [selectedCompetitorId, setSelectedCompetitorId] = useState("");

  // Fetch products
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ["/api/products/manager"],
  });

  // Fetch competitors
  const { data: competitors = [], isLoading: competitorsLoading } = useQuery<Competitor[]>({
    queryKey: ["/api/competitors"],
  });

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: (data: { sku: string; name: string; targetPrice: number | null }) =>
      apiRequest("POST", "/api/products/manager", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/manager"] });
      setShowAddProduct(false);
      setNewProductData({ sku: "", name: "", targetPrice: "" });
      toast({ 
        title: "Product Created",
        description: "Product has been added successfully"
      });
    },
    onError: () => {
      toast({ 
        title: "Failed to create product", 
        variant: "destructive" 
      });
    },
  });

  // Create competitor mutation
  const createCompetitor = useMutation({
    mutationFn: (data: { name: string; domain: string }) =>
      apiRequest("POST", "/api/competitors", { ...data, active: true }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      setNewCompetitor({ name: "", domain: "" });
      toast({ 
        title: "Competitor Added",
        description: "New competitor has been registered"
      });
    },
    onError: () => {
      toast({ 
        title: "Failed to add competitor", 
        variant: "destructive" 
      });
    },
  });

  // Add listing mutation (with automatic scraping)
  const addListing = useMutation({
    mutationFn: (data: { productId: string; competitorId: string; url: string }) =>
      apiRequest("POST", "/api/products/listings", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/manager"] });
      setNewListingUrl("");
      setSelectedCompetitorId("");
      toast({ 
        title: "Listing Added",
        description: "URL has been added and will be scraped shortly"
      });
    },
    onError: () => {
      toast({ 
        title: "Failed to add listing", 
        variant: "destructive" 
      });
    },
  });

  // Delete listing mutation
  const deleteListing = useMutation({
    mutationFn: (listingId: string) =>
      apiRequest("DELETE", `/api/products/listings/${listingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/manager"] });
      toast({ title: "Listing removed" });
    },
  });

  // Trigger manual scrape
  const triggerScrape = useMutation({
    mutationFn: (listingId: string) =>
      apiRequest("POST", `/api/products/listings/${listingId}/scrape`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/manager"] });
      toast({ 
        title: "Scraping Started",
        description: "Product information is being updated"
      });
    },
    onError: () => {
      toast({ 
        title: "Scraping failed", 
        variant: "destructive" 
      });
    },
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate({
      sku: newProductData.sku,
      name: newProductData.name,
      targetPrice: newProductData.targetPrice ? parseFloat(newProductData.targetPrice) : null
    });
  };

  const handleAddCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    createCompetitor.mutate(newCompetitor);
  };

  const handleAddListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct && selectedCompetitorId && newListingUrl) {
      addListing.mutate({
        productId: selectedProduct.id,
        competitorId: selectedCompetitorId,
        url: newListingUrl
      });
    }
  };

  const getPriceChangeIcon = (change: number | null) => {
    if (!change || change === 0) return <Minus className="h-4 w-4 text-gray-400" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />;
    }
  };

  if (productsLoading || competitorsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <Activity className="h-12 w-12 text-red-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading product manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Package className="h-10 w-10 text-red-500" />
              Product Intelligence Hub
            </h1>
            <p className="text-gray-400">
              Track competitor prices and monitor product listings in real-time
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => refetchProducts()}
              variant="outline"
              className="border-gray-700 hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={() => setShowAddProduct(true)}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Products</p>
                <p className="text-2xl font-bold text-white">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Competitors</p>
                <p className="text-2xl font-bold text-white">{competitors.length}</p>
              </div>
              <Globe className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Listings</p>
                <p className="text-2xl font-bold text-white">
                  {products.reduce((acc, p) => acc + p.listings.length, 0)}
                </p>
              </div>
              <Link2 className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Last Sync</p>
                <p className="text-lg font-semibold text-white">Daily</p>
              </div>
              <Activity className="h-8 w-8 text-yellow-500 animate-pulse" />
            </div>
          </div>
        </Card>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddProduct(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-red-500" />
                Add New Product
              </h2>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">SKU</label>
                  <Input
                    value={newProductData.sku}
                    onChange={(e) => setNewProductData({...newProductData, sku: e.target.value})}
                    placeholder="e.g., GB40-NOCO"
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Product Name</label>
                  <Input
                    value={newProductData.name}
                    onChange={(e) => setNewProductData({...newProductData, name: e.target.value})}
                    placeholder="e.g., NOCO GB40 Jump Starter"
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Target Price (Optional)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProductData.targetPrice}
                    onChange={(e) => setNewProductData({...newProductData, targetPrice: e.target.value})}
                    placeholder="e.g., 199.99"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddProduct(false)}
                    className="flex-1 border-gray-700 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-500"
                    disabled={createProduct.isPending}
                  >
                    {createProduct.isPending ? "Creating..." : "Create Product"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto">
        {products.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur p-12 text-center">
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Products Yet</h3>
            <p className="text-gray-400 mb-6">Start by adding your first product to track</p>
            <Button 
              onClick={() => setShowAddProduct(true)}
              className="bg-gradient-to-r from-red-600 to-red-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Product
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur hover:bg-gray-800/70 transition-all duration-200">
                  <div className="p-6">
                    {/* Product Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-1">{product.name}</h3>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant="outline" className="border-gray-600 text-gray-400">
                            {product.sku}
                          </Badge>
                          {product.targetPrice && (
                            <span className="text-green-500 flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {product.targetPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedProduct(product)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Competitor Listings */}
                    <div className="space-y-2">
                      {product.listings.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No competitor listings yet
                        </div>
                      ) : (
                        product.listings.map((listing) => (
                          <div 
                            key={listing.id}
                            className="bg-gray-900/50 rounded-lg p-3 border border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-white">
                                  {listing.competitor?.name || 'Unknown'}
                                </span>
                                {getStatusIcon(listing.status)}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => triggerScrape.mutate(listing.id)}
                                  className="h-7 w-7 p-0"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(listing.url, '_blank')}
                                  className="h-7 w-7 p-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteListing.mutate(listing.id)}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {listing.title && (
                              <p className="text-xs text-gray-400 mb-2 truncate">
                                {listing.title}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {listing.currentPrice ? (
                                  <span className="text-lg font-bold text-white">
                                    ${listing.currentPrice.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500">
                                    No price yet
                                  </span>
                                )}
                                {listing.priceChange !== null && listing.priceChange !== 0 && (
                                  <div className="flex items-center gap-1">
                                    {getPriceChangeIcon(listing.priceChange)}
                                    <span className={`text-xs ${listing.priceChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                      {Math.abs(listing.priceChange)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                              {listing.lastScraped && (
                                <span className="text-xs text-gray-500">
                                  {new Date(listing.lastScraped).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Listing Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                Add Competitor Listing
              </h2>
              
              {/* Add Competitor Form */}
              {competitors.length === 0 && (
                <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">
                    First, add a competitor:
                  </h3>
                  <form onSubmit={handleAddCompetitor} className="flex gap-2">
                    <Input
                      value={newCompetitor.name}
                      onChange={(e) => setNewCompetitor({...newCompetitor, name: e.target.value})}
                      placeholder="Competitor name"
                      className="bg-gray-900 border-gray-700 text-white"
                      required
                    />
                    <Input
                      value={newCompetitor.domain}
                      onChange={(e) => setNewCompetitor({...newCompetitor, domain: e.target.value})}
                      placeholder="Domain (e.g., bunnings.com.au)"
                      className="bg-gray-900 border-gray-700 text-white"
                      required
                    />
                    <Button type="submit" className="bg-red-600 hover:bg-red-500">
                      Add
                    </Button>
                  </form>
                </div>
              )}

              {/* Add Listing Form */}
              <form onSubmit={handleAddListing} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Select Competitor</label>
                  <select
                    value={selectedCompetitorId}
                    onChange={(e) => setSelectedCompetitorId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Choose a competitor...</option>
                    {competitors.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} ({comp.domain})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Product URL</label>
                  <Input
                    value={newListingUrl}
                    onChange={(e) => setNewListingUrl(e.target.value)}
                    placeholder="https://example.com/product-page"
                    className="bg-gray-900 border-gray-700 text-white"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The system will automatically extract the title and price from this URL
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedProduct(null);
                      setNewListingUrl("");
                      setSelectedCompetitorId("");
                    }}
                    className="flex-1 border-gray-700 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-500"
                    disabled={addListing.isPending || !selectedCompetitorId}
                  >
                    {addListing.isPending ? "Adding..." : "Add Listing"}
                  </Button>
                </div>
              </form>

              {/* Quick Add Competitor */}
              {competitors.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <details className="text-sm">
                    <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                      Add new competitor
                    </summary>
                    <form onSubmit={handleAddCompetitor} className="flex gap-2 mt-3">
                      <Input
                        value={newCompetitor.name}
                        onChange={(e) => setNewCompetitor({...newCompetitor, name: e.target.value})}
                        placeholder="Name"
                        className="bg-gray-900 border-gray-700 text-white text-sm"
                        required
                      />
                      <Input
                        value={newCompetitor.domain}
                        onChange={(e) => setNewCompetitor({...newCompetitor, domain: e.target.value})}
                        placeholder="Domain"
                        className="bg-gray-900 border-gray-700 text-white text-sm"
                        required
                      />
                      <Button type="submit" size="sm" className="bg-red-600 hover:bg-red-500">
                        Add
                      </Button>
                    </form>
                  </details>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}