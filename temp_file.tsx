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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  Store,
  Minus,
  Palette,
  Upload,
  Settings,
  Check,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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
  price?: number;
  originalPrice?: number;
  image?: string;
  brand?: string;
  category?: string;
  competitorLinks: CompetitorLink[];
  createdAt: string;
  updatedAt: string;
}

interface CardCustomization {
  id: string;
  type: 'brand' | 'category' | 'competitor';
  title: string;
  showTitle: boolean;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  customStyles?: string;
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
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [cardCustomizations, setCardCustomizations] = useState<Map<string, CardCustomization>>(new Map());
  const [editingCard, setEditingCard] = useState<CardCustomization | null>(null);
  const [showCardCustomDialog, setShowCardCustomDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(16); // 4 cards per row × 4 rows = 16 per page
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

  // Bulk delete mutation
  const bulkDeleteProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/products-unified/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products-unified"] });
      const deletedCount = selectedProducts.size;
      setSelectedProducts(new Set());
      setShowBulkDeleteDialog(false);
      toast({ 
        title: "Products deleted successfully", 
        description: `Deleted ${deletedCount} products`
      });
    },
    onError: () => {
      toast({ title: "Failed to delete products", variant: "destructive" });
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Bulk selection helper functions
  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAllProducts = () => {
    setSelectedProducts(new Set(paginatedProducts.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const isAllSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProducts.has(p.id));

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

  // Card customization functions
  const getCardCustomization = (id: string, type: 'brand' | 'category' | 'competitor'): CardCustomization => {
    return cardCustomizations.get(id) || {
      id,
      type,
      title: id,
      showTitle: true,
      backgroundColor: 'bg-white dark:bg-slate-900',
      textColor: 'text-slate-900 dark:text-white',
      logoUrl: '',
      customStyles: ''
    };
  };

  const updateCardCustomization = (customization: CardCustomization) => {
    const newCustomizations = new Map(cardCustomizations);
    newCustomizations.set(customization.id, customization);
    setCardCustomizations(newCustomizations);
  };

  const openCardEditor = (id: string, type: 'brand' | 'category' | 'competitor') => {
    const existing = getCardCustomization(id, type);
    setEditingCard(existing);
    setShowCardCustomDialog(true);
  };

  const saveCardCustomization = () => {
    if (editingCard) {
      updateCardCustomization(editingCard);
      setShowCardCustomDialog(false);
      setEditingCard(null);
    }
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
      <div className="p-6 w-full max-w-none space-y-8">
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

        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Total Products Card */}
          <Card className="relative group overflow-hidden bg-gradient-to-br from-white via-red-50 to-red-100 border-red-200 hover:border-red-300 shadow-xl hover:shadow-2xl transition-all duration-500">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Floating Particles Effect */}
            <div className="absolute top-2 right-2 w-20 h-20 bg-red-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-150" />
            
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">Total Products</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black text-red-900">{products?.length || 0}</p>
                    <span className="text-sm text-red-500 font-medium">items</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                  <div className="relative p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                    <Package2 className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4 pt-4 border-t border-red-200">
                <div className="flex items-center justify-between text-xs text-red-600 mb-2">
                  <span>Catalog Growth</span>
                  <span>+{products?.length || 0} this month</span>
                </div>
                <div className="w-full bg-red-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '75%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competitor Links Card */}
          <Card className="relative group overflow-hidden bg-gradient-to-br from-white via-blue-50 to-blue-100 border-blue-200 hover:border-blue-300 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-2 right-2 w-20 h-20 bg-blue-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-150" />
            
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Competitor Links</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black text-blue-900">{totalCompetitorLinks}</p>
                    <span className="text-sm text-blue-500 font-medium">tracked</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                  <div className="relative p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                    <Link className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="flex items-center justify-between text-xs text-blue-600 mb-2">
                  <span>Coverage Rate</span>
                  <span>85% monitored</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '85%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Advantage Card */}
          <Card className="relative group overflow-hidden bg-gradient-to-br from-white via-green-50 to-emerald-100 border-green-200 hover:border-green-300 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-2 right-2 w-20 h-20 bg-green-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-150" />
            
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Price Advantage</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black text-green-900">{priceAdvantageCount}</p>
                    <span className="text-sm text-green-500 font-medium">products</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                  <div className="relative p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                    <DollarSign className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-green-200">
                <div className="flex items-center justify-between text-xs text-green-600 mb-2">
                  <span>Competitive Edge</span>
                  <span>92% optimal</span>
                </div>
                <div className="w-full bg-green-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '92%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Need Adjustment Card */}
          <Card className="relative group overflow-hidden bg-gradient-to-br from-white via-orange-50 to-red-100 border-orange-200 hover:border-orange-300 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-2 right-2 w-20 h-20 bg-orange-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-150" />
            
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Need Adjustment</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-black text-orange-900">{needAdjustmentCount}</p>
                    <span className="text-sm text-orange-500 font-medium">urgent</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                  <div className="relative p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-orange-200">
                <div className="flex items-center justify-between text-xs text-orange-600 mb-2">
                  <span>Action Required</span>
                  <span>High priority</span>
                </div>
                <div className="w-full bg-orange-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '25%' }}></div>
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

