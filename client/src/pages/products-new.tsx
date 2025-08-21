import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Package2, 
  Link, 
  DollarSign, 
  TrendingUp, 
  Trash2, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Grid,
  Image as ImageIcon,
  ShoppingCart,
  Edit,
  Save,
  Tag,
  Building2,
  Store
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CompetitorLink {
  id: string;
  url: string;
  competitorName: string;
  extractedTitle?: string;
  extractedPrice?: number;
  extractedImage?: string;
  lastScraped?: string;
  status: "pending" | "success" | "error";
  isCategory?: boolean;
  productCount?: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  ourPrice?: number;
  brand?: string;
  category?: string;
  competitorLinks: CompetitorLink[];
  createdAt: string;
  updatedAt: string;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryUrl, setCategoryUrl] = useState("");
  const [isExtractingCategory, setIsExtractingCategory] = useState(false);
  const [extractedProducts, setExtractedProducts] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({
    sku: "",
    name: "",
    ourPrice: "",
    competitorUrls: [""]
  });

  // Fetch products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products-unified"],
  });

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products-unified", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products-unified"] });
      setShowAddDialog(false);
      resetForm();
      toast({ 
        title: "Product added successfully", 
        description: "We'll start monitoring competitor prices right away."
      });
    },
    onError: () => {
      toast({ title: "Failed to add product", variant: "destructive" });
    },
  });

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products-unified/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products-unified"] });
      toast({ title: "Product deleted" });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PUT", `/api/products-unified/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products-unified"] });
      setShowEditDialog(false);
      setEditingProduct(null);
      toast({ title: "Product updated successfully" });
    },
    onError: () => {
      toast({ 
        title: "Update failed",
        description: "Failed to update product",
        variant: "destructive"
      });
    }
  });

  // Extract data from URL mutation
  const extractFromUrl = useMutation({
    mutationFn: (url: string) => apiRequest("POST", "/api/extract-url", { url }),
    onSuccess: (data: any, url: string) => {
      const index = newProduct.competitorUrls.findIndex(u => u === url);
      if (index > -1 && data) {
        // Auto-fill product name if empty
        if (!newProduct.name && data.title) {
          setNewProduct(prev => ({ ...prev, name: data.title }));
        }
        toast({ 
          title: "URL data extracted",
          description: `Found: ${data.title} - $${data.price}`
        });
      }
    },
  });

  // Extract products from category page
  const extractFromCategory = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/extract-category", { url });
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log("Category extraction response:", data);
      setIsExtractingCategory(false);
      
      if (data.products && data.products.length > 0) {
        setExtractedProducts(data.products);
        const noteMsg = data.note ? ` (${data.note})` : '';
        toast({ 
          title: "Category products extracted",
          description: `Found ${data.products.length} products from ${data.categoryName || 'category'}${noteMsg}`
        });
      } else {
        toast({ 
          title: "No products found",
          description: data.details || "Could not extract products from this category page",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error("Category extraction error:", error);
      setIsExtractingCategory(false);
      toast({ 
        title: "Extraction failed",
        description: error.message || "Failed to extract products from category page",
        variant: "destructive"
      });
    }
  });

  // Bulk import products with source URL
  const bulkImportProducts = useMutation({
    mutationFn: (data: { products: any[], sourceUrl: string }) => 
      apiRequest("POST", "/api/products-unified/bulk", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products-unified"] });
      setShowBulkImportDialog(false);
      setExtractedProducts([]);
      setCategoryUrl("");
      
      const description = data.matched > 0 
        ? `Added ${data.count} new products and matched ${data.matched} existing products from ${data.competitor}`
        : `Added ${data.count} products from ${data.competitor} in ${data.category}`;
      
      toast({ 
        title: "Import successful",
        description: description
      });
    },
    onError: () => {
      toast({ 
        title: "Import failed",
        description: "Failed to import products",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setNewProduct({
      sku: "",
      name: "",
      ourPrice: "",
      competitorUrls: [""]
    });
  };

  const handleAddUrl = () => {
    setNewProduct(prev => ({
      ...prev,
      competitorUrls: [...prev.competitorUrls, ""]
    }));
  };

  const handleRemoveUrl = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      competitorUrls: prev.competitorUrls.filter((_, i) => i !== index)
    }));
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...newProduct.competitorUrls];
    newUrls[index] = value;
    setNewProduct(prev => ({ ...prev, competitorUrls: newUrls }));

    // Auto-extract when URL is complete
    if (value.startsWith("http")) {
      extractFromUrl.mutate(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validUrls = newProduct.competitorUrls.filter(url => url.trim());
    createProduct.mutate({
      ...newProduct,
      ourPrice: newProduct.ourPrice ? parseFloat(newProduct.ourPrice) : undefined,
      competitorUrls: validUrls
    });
  };

  const filteredProducts = products.filter(product =>
    (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLowestCompetitorPrice = (links: CompetitorLink[]) => {
    const prices = links.filter(l => l.extractedPrice).map(l => l.extractedPrice!);
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  // Calculate stats for the overview cards
  const totalCompetitorLinks = products?.reduce((acc, product) => acc + product.competitorLinks.length, 0) || 0;
  const priceAdvantageCount = products?.filter(product => {
    const lowestPrice = getLowestCompetitorPrice(product.competitorLinks);
    return product.ourPrice && lowestPrice && product.ourPrice < lowestPrice;
  }).length || 0;
  const needAdjustmentCount = products?.filter(product => {
    const lowestPrice = getLowestCompetitorPrice(product.competitorLinks);
    return product.ourPrice && lowestPrice && product.ourPrice > lowestPrice * 1.05;
  }).length || 0;

  const getPriceStatus = (ourPrice?: number, lowestCompetitorPrice?: number | null) => {
    if (!ourPrice || !lowestCompetitorPrice) return null;
    const diff = ((ourPrice - lowestCompetitorPrice) / lowestCompetitorPrice) * 100;
    if (diff < -5) return { label: "Below Market", color: "text-green-600", icon: TrendingUp };
    if (diff > 5) return { label: "Above Market", color: "text-red-600", icon: AlertCircle };
    return { label: "Competitive", color: "text-blue-600", icon: CheckCircle2 };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  // Extract unique brands and categories from products
  const uniqueBrands = Array.from(new Set(products.map(p => p.brand || 'Unknown'))).sort();
  const uniqueCategories = Array.from(new Set(products.map(p => p.category || 'Uncategorized'))).sort();
  const competitors = Array.from(new Set(products.flatMap(p => 
    p.competitorLinks.map(l => l.competitorName || 'Unknown')
  ))).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-slate-950 dark:via-gray-950 dark:to-slate-900">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Modern Header with Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent">
              Product Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
              Track your products and monitor competitor prices with AI-powered insights
            </p>
          </div>
          <div className="flex gap-3">
          <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
                <Grid className="h-4 w-4 mr-2" />
                Import Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Products from Category Page</DialogTitle>
                <DialogDescription>
                  Enter a category page URL to extract all products with their titles, prices, and images.
                  Supports pagination automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="categoryUrl">Category Page URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="categoryUrl"
                      value={categoryUrl}
                      onChange={(e) => setCategoryUrl(e.target.value)}
                      placeholder="https://sydneytools.com.au/category/automotive/car-battery-chargers"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        setIsExtractingCategory(true);
                        extractFromCategory.mutate(categoryUrl);
                      }}
                      disabled={!categoryUrl || isExtractingCategory}
                    >
                      {isExtractingCategory ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Extract
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {extractedProducts.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">
                        Found {extractedProducts.length} products
                      </p>
                      <Button
                        size="sm"
                        onClick={() => bulkImportProducts.mutate({ 
                          products: extractedProducts, 
                          sourceUrl: categoryUrl 
                        })}
                        disabled={bulkImportProducts.isPending}
                      >
                        {bulkImportProducts.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Import All
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto border rounded-lg p-4 space-y-3">
                      {extractedProducts.map((product, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          {product.image && (
                            <img 
                              src={product.image} 
                              alt={product.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.title}</p>
                            <p className="text-sm text-muted-foreground">SKU: {product.sku || `AUTO-${index + 1}`}</p>
                          </div>
                          <div className="text-right">
                            {product.isOnSale ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 justify-end">
                                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">SALE</span>
                                  <p className="font-bold text-lg text-green-600">${product.price}</p>
                                </div>
                                <p className="text-sm text-muted-foreground line-through">was ${product.originalPrice}</p>
                              </div>
                            ) : (
                              <p className="font-bold text-lg">${product.price}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                  Add New Product
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400">
                  Create a new product and add competitor links for price monitoring
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="e.g., JMP-001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ourPrice">Our Price (optional)</Label>
                  <Input
                    id="ourPrice"
                    type="number"
                    step="0.01"
                    value={newProduct.ourPrice}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, ourPrice: e.target.value }))}
                    placeholder="e.g., 199.99"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Will auto-fill from first URL"
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Competitor URLs</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddUrl}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add URL
                  </Button>
                </div>
                {newProduct.competitorUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => handleUrlChange(index, e.target.value)}
                      placeholder="https://competitor.com/product-page"
                      className="flex-1"
                    />
                    {newProduct.competitorUrls.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUrl(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Paste competitor product URLs. We'll extract the title and price automatically.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProduct.isPending}>
                  {createProduct.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Product"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Product Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                Edit Product
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Update product details, brand, category, and pricing information
              </DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateProduct.mutate({
                  id: editingProduct.id,
                  name: formData.get("name") as string,
                  sku: formData.get("sku") as string,
                  ourPrice: parseFloat(formData.get("ourPrice") as string) || 0,
                  brand: formData.get("brand") as string,
                  category: formData.get("category") as string
                });
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-sku">SKU</Label>
                    <Input
                      id="edit-sku"
                      name="sku"
                      defaultValue={editingProduct.sku}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-ourPrice">Our Price</Label>
                    <Input
                      id="edit-ourPrice"
                      name="ourPrice"
                      type="number"
                      step="0.01"
                      defaultValue={editingProduct.ourPrice}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-name">Product Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editingProduct.name}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-brand">Brand</Label>
                    <Input
                      id="edit-brand"
                      name="brand"
                      defaultValue={(editingProduct as any).brand || ""}
                      placeholder="e.g., NOCO, CTEK"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Category</Label>
                    <Input
                      id="edit-category"
                      name="category"
                      defaultValue={(editingProduct as any).category || ""}
                      placeholder="e.g., Battery Chargers"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-700 dark:text-slate-300">Competitor Links</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    {editingProduct.competitorLinks.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs border-red-200 text-red-700 dark:border-red-800 dark:text-red-300">
                              {link.competitorName}
                            </Badge>
                            {link.extractedPrice && (
                              <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">${link.extractedPrice}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                            {link.url}
                          </p>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateProduct.isPending}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  >
                    {updateProduct.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
          </div>
        </div>

        {/* Modern Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Total Products</p>
                  <p className="text-3xl font-bold text-white mt-2">{products?.length || 0}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg">
                  <Package2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Competitor Links</p>
                  <p className="text-3xl font-bold text-white mt-2">{totalCompetitorLinks}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
                  <Link className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Price Advantage</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-2">{priceAdvantageCount}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Need Adjustment</p>
                  <p className="text-3xl font-bold text-red-400 mt-2">{needAdjustmentCount}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-lg">
            <TabsTrigger value="all" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <Package2 className="h-4 w-4 mr-2" />
              All Products
            </TabsTrigger>
            <TabsTrigger value="brands" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <Tag className="h-4 w-4 mr-2" />
              Brands ({uniqueBrands.length})
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <Grid className="h-4 w-4 mr-2" />
              Categories ({uniqueCategories.length})
            </TabsTrigger>
            <TabsTrigger value="competitors" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <Store className="h-4 w-4 mr-2" />
              Competitors ({competitors.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {/* Modern Search Bar */}
            <Card className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 shadow-xl mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <Search className="h-5 w-5 text-red-600" />
                  </div>
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 border-0 bg-transparent text-lg placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-500"
                  />
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
            {filteredProducts.map((product) => {
              const lowestPrice = getLowestCompetitorPrice(product.competitorLinks);
              const priceStatus = getPriceStatus(product.ourPrice, lowestPrice);
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Product Image */}
                    {product.image && (
                      <div className="h-48 w-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    <CardHeader className="relative">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white line-clamp-2">{product.name}</CardTitle>
                          <CardDescription className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs border-slate-300 dark:border-slate-600">
                              SKU: {product.sku}
                            </Badge>
                            {product.brand && product.brand !== 'Unknown' && (
                              <Badge variant="secondary" className="text-xs">
                                {product.brand}
                              </Badge>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => {
                              setEditingProduct(product);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => deleteProduct.mutate(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Modern Price Comparison */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {product.ourPrice ? 'Our Price' : 'Market Price'}
                            </p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                              ${product.price || product.ourPrice || '0'}
                            </p>
                          </div>
                          {lowestPrice && (
                            <div className="text-right">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lowest Competitor</p>
                              <p className="text-2xl font-bold text-red-600 dark:text-red-400">${lowestPrice}</p>
                            </div>
                          )}
                        </div>
                        {priceStatus && (
                          <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-lg ${priceStatus.color} bg-white/50 dark:bg-slate-900/50`}>
                            <priceStatus.icon className="h-4 w-4" />
                            <span className="text-sm font-semibold">{priceStatus.label}</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="relative">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Competitor Links
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {product.competitorLinks.length}
                          </Badge>
                        </div>
                        
                        {product.competitorLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  variant={link.status === "success" ? "default" : link.status === "error" ? "destructive" : "secondary"}
                                  className="text-xs"
                                >
                                  {link.competitorName || "Extracting..."}
                                </Badge>
                                {link.isCategory && (
                                  <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">
                                    <Grid className="h-3 w-3 mr-1" />
                                    Category ({link.productCount || 0})
                                  </Badge>
                                )}
                                {link.extractedPrice && (
                                  <div className="flex items-center gap-2">
                                    {(link as any).isOnSale && (link as any).originalPrice ? (
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                          now ${link.extractedPrice}
                                        </span>
                                        <span className="text-xs text-slate-400 line-through">
                                          was ${(link as any).originalPrice}
                                        </span>
                                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 border-red-200">
                                          SALE
                                        </Badge>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">${link.extractedPrice}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {link.extractedImage && (
                                <img 
                                  src={link.extractedImage} 
                                  alt={link.extractedTitle || "Product"}
                                  className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-600 mb-2"
                                />
                              )}
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {link.url}
                              </p>
                            </div>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-3 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                        
                        {product.competitorLinks.length === 0 && (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                              <Link className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              No competitor links added yet
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                </Card>
              </motion.div>
            );
          })}
              </AnimatePresence>
          
          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Package2 className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No products found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {searchTerm ? "Try a different search term" : "Add your first product to get started"}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              )}
            </div>
          )}
        </div>
          </TabsContent>

          <TabsContent value="brands" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uniqueBrands.map(brand => {
                const brandProducts = products.filter(p => (p.brand || 'Unknown') === brand);
                const lowestPrice = Math.min(...brandProducts.map(p => p.ourPrice || Infinity).filter(p => p !== Infinity));
                const highestPrice = Math.max(...brandProducts.map(p => p.ourPrice || 0));
                
                return (
                  <Card key={brand} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold flex items-center justify-between">
                        <span>{brand}</span>
                        <Badge variant="secondary">{brandProducts.length}</Badge>
                      </CardTitle>
                      <CardDescription>
                        {lowestPrice !== Infinity && (
                          <span className="text-sm">
                            Price range: ${lowestPrice.toFixed(2)} - ${highestPrice.toFixed(2)}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {brandProducts.slice(0, 3).map(product => (
                          <div key={product.id} className="text-sm text-slate-600 dark:text-slate-400 truncate">
                            • {product.name}
                          </div>
                        ))}
                        {brandProducts.length > 3 && (
                          <p className="text-xs text-slate-500">
                            +{brandProducts.length - 3} more products
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uniqueCategories.map(category => {
                const categoryProducts = products.filter(p => (p.category || 'Uncategorized') === category);
                const categoryBrands = Array.from(new Set(categoryProducts.map(p => p.brand || 'Unknown')));
                
                return (
                  <Card key={category} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold flex items-center justify-between">
                        <span>{category}</span>
                        <Badge variant="secondary">{categoryProducts.length}</Badge>
                      </CardTitle>
                      <CardDescription>
                        {categoryBrands.length} brands in this category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {categoryBrands.slice(0, 5).map(brand => (
                          <Badge key={brand} variant="outline" className="text-xs">
                            {brand}
                          </Badge>
                        ))}
                        {categoryBrands.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{categoryBrands.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="competitors" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {competitors.map(competitor => {
                const competitorProducts = products.filter(p => 
                  p.competitorLinks.some(l => (l.competitorName || 'Unknown') === competitor)
                );
                const competitorLinks = products.flatMap(p => 
                  p.competitorLinks.filter(l => (l.competitorName || 'Unknown') === competitor)
                );
                const avgPrice = competitorLinks
                  .filter(l => l.extractedPrice)
                  .reduce((sum, l) => sum + (l.extractedPrice || 0), 0) / 
                  (competitorLinks.filter(l => l.extractedPrice).length || 1);
                
                return (
                  <Card key={competitor} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold flex items-center justify-between">
                        <span>{competitor}</span>
                        <Badge variant="secondary">{competitorProducts.length}</Badge>
                      </CardTitle>
                      <CardDescription>
                        {competitorLinks.length} product links tracked
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Avg Price</span>
                          <span className="font-semibold">${avgPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Last Scraped</span>
                          <span className="text-xs text-slate-500">
                            {competitorLinks[0]?.lastScraped ? new Date(competitorLinks[0].lastScraped).toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}