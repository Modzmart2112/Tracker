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
  Save
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
  competitorLinks: CompetitorLink[];
  createdAt: string;
  updatedAt: string;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<UnifiedProduct | null>(null);
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
    mutationFn: (url: string) => apiRequest("POST", "/api/extract-category", { url }),
    onSuccess: (data: any) => {
      if (data.products && data.products.length > 0) {
        setExtractedProducts(data.products);
        toast({ 
          title: "Category products extracted",
          description: `Found ${data.products.length} products from ${data.totalPages || 1} page(s)`
        });
      } else {
        toast({ 
          title: "No products found",
          description: "Could not extract products from this category page",
          variant: "destructive"
        });
      }
      setIsExtractingCategory(false);
    },
    onError: () => {
      toast({ 
        title: "Extraction failed",
        description: "Failed to extract products from category page",
        variant: "destructive"
      });
      setIsExtractingCategory(false);
    }
  });

  // Bulk import products
  const bulkImportProducts = useMutation({
    mutationFn: (products: any[]) => apiRequest("POST", "/api/products-unified/bulk", { products }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products-unified"] });
      setShowBulkImportDialog(false);
      setExtractedProducts([]);
      setCategoryUrl("");
      toast({ 
        title: "Products imported successfully",
        description: `Added ${data.count} products to your catalog`
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
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLowestCompetitorPrice = (links: CompetitorLink[]) => {
    const prices = links.filter(l => l.extractedPrice).map(l => l.extractedPrice!);
    return prices.length > 0 ? Math.min(...prices) : null;
  };

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Product Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your products and monitor competitor prices in real-time
          </p>
        </div>
        <div className="flex gap-2">
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
                        onClick={() => bulkImportProducts.mutate(extractedProducts)}
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
                            <p className="font-bold text-lg">${product.price}</p>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Add a product and tag it with competitor URLs. We'll automatically extract prices and monitor them daily.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
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
                      defaultValue={editingProduct.brand || ""}
                      placeholder="e.g., NOCO, CTEK"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Category</Label>
                    <Input
                      id="edit-category"
                      name="category"
                      defaultValue={editingProduct.category || ""}
                      placeholder="e.g., Battery Chargers"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Competitor Links</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-gray-50 rounded-lg">
                    {editingProduct.competitorLinks.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {link.competitorName}
                            </Badge>
                            {link.extractedPrice && (
                              <span className="font-semibold text-sm">${link.extractedPrice}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {link.url}
                          </p>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-gray-400 hover:text-gray-600"
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products by name or SKU..."
          className="pl-10 bg-white"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <Package2 className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Links Tracked</p>
                <p className="text-2xl font-bold">
                  {products.reduce((acc, p) => acc + p.competitorLinks.length, 0)}
                </p>
              </div>
              <Link className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Price Alerts</p>
                <p className="text-2xl font-bold">
                  {products.filter(p => {
                    const lowest = getLowestCompetitorPrice(p.competitorLinks);
                    return p.ourPrice && lowest && p.ourPrice > lowest;
                  }).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Scan</p>
                <p className="text-lg font-semibold">2 hours ago</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

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
                <Card className="hover:shadow-xl transition-all duration-300 border-gray-200 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardHeader className="relative">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            SKU: {product.sku}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
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
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteProduct.mutate(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Price Comparison */}
                    {product.ourPrice && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Our Price</p>
                            <p className="text-xl font-bold">${product.ourPrice}</p>
                          </div>
                          {lowestPrice && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Lowest Competitor</p>
                              <p className="text-xl font-bold text-red-600">${lowestPrice}</p>
                            </div>
                          )}
                        </div>
                        {priceStatus && (
                          <div className={`flex items-center gap-1 mt-2 ${priceStatus.color}`}>
                            <priceStatus.icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{priceStatus.label}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="relative">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Competitor Links ({product.competitorLinks.length})
                      </p>
                      {product.competitorLinks.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={link.status === "success" ? "default" : link.status === "error" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {link.competitorName || "Extracting..."}
                              </Badge>
                              {link.isCategory && (
                                <Badge variant="outline" className="text-xs">
                                  <Grid className="h-3 w-3 mr-1" />
                                  Category ({link.productCount || 0})
                                </Badge>
                              )}
                              {link.extractedPrice && (
                                <span className="font-semibold">${link.extractedPrice}</span>
                              )}
                            </div>
                            {link.extractedImage && (
                              <img 
                                src={link.extractedImage} 
                                alt={link.extractedTitle || "Product"}
                                className="w-12 h-12 object-cover rounded mt-1"
                              />
                            )}
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {link.url}
                            </p>
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                      {product.competitorLinks.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No competitor links added yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Package2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-600">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? "Try a different search term" : "Add your first product to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}