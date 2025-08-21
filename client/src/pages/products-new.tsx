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
import { ObjectUploader } from "@/components/ObjectUploader";
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
  modelNumber?: string;
  name: string;
  ourPrice?: number;
  price?: number;
  originalPrice?: number;
  image?: string;
  brand?: string;
  category?: string;
  productPageUrl?: string;
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

// Extract model number from product title
const extractModelNumber = (productName: string): string => {
  if (!productName) return 'N/A';
  
  // Common patterns for model numbers in product titles
  // Pattern 1: Alphanumeric combinations with optional hyphens (e.g., SPi Pro25, SC1446, DSR115)
  const patterns = [
    /\b([A-Z]{2,}[\s-]?[A-Z0-9]+[0-9]+[A-Z0-9]*)\b/i,  // e.g., SPi Pro25, DSR115
    /\b([A-Z]+[0-9]+[A-Z0-9]*)\b/,                        // e.g., SC1446, IP65
    /\b([0-9]+[A-Z]+[0-9]*)\b/,                           // e.g., 12V50A
    /\b([A-Z][0-9]{2,}[A-Z0-9]*)\b/,                      // e.g., T12345
  ];
  
  for (const pattern of patterns) {
    const match = productName.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // If no pattern matches, try to find any alphanumeric code after the brand name
  const words = productName.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    // Check if word contains both letters and numbers
    if (/[A-Z]/i.test(word) && /[0-9]/.test(word)) {
      return word;
    }
  }
  
  return 'N/A';
};

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
  const [cardCustomizations, setCardCustomizations] = useState<Map<string, CardCustomization>>(() => {
    // Load saved customizations from localStorage
    try {
      const saved = localStorage.getItem('cardCustomizations');
      if (saved) {
        const parsed = JSON.parse(saved);
        return new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('Failed to load card customizations:', error);
    }
    return new Map();
  });
  const [editingCard, setEditingCard] = useState<CardCustomization | null>(null);
  const [showCardCustomDialog, setShowCardCustomDialog] = useState(false);
  const [showCompetitorImportDialog, setShowCompetitorImportDialog] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");
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

  // Import competitor products
  const importCompetitor = useMutation({
    mutationFn: (data: { url: string }) => 
      apiRequest("POST", "/api/import-competitor", data),
    onSuccess: (data: any) => {
      console.log("Competitor import response:", data);
      if (data.success && data.products && data.products.length > 0) {
        setExtractedProducts(data.products);
        setShowBulkImportDialog(true);
        toast({ 
          title: "Competitor Import Successful",
          description: `Found ${data.products.length} products from ${data.competitorName || 'competitor'}. Review and import them.`
        });
      } else {
        toast({ 
          title: "No products found",
          description: data.message || "Could not extract products from this competitor site",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error("Competitor import error:", error);
      toast({ 
        title: "Import failed",
        description: error.message || "Failed to import competitor products",
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

  // Helper function to extract model number from product name
  const extractModelNumber = (name: string): string => {
    if (!name) return 'N/A';
    
    // Remove common brand names first to avoid capturing them
    const brandPatterns = [
      /^(Schumacher|Matson|NOCO|DeWalt|Makita|Milwaukee|Bosch|Ryobi|SP Tools|Sydney Tools)\s+/i,
      /^(Black & Decker|Black and Decker|Stanley|Craftsman|Ridgid)\s+/i,
    ];
    
    let cleanedName = name;
    for (const pattern of brandPatterns) {
      cleanedName = cleanedName.replace(pattern, '');
    }
    
    // Model number patterns (more specific patterns first)
    const patterns = [
      // SP Tools models like SP61086, SP12345
      /\b(SP\d{4,6}[A-Z]*)\b/i,
      // NOCO GENIUS models like GENIUSPRO50, GENIUS2DAU, GENIUS2X4, GENIUS2X2
      /\b(GENIUS(?:PRO)?\d+[A-Z0-9]*)\b/i,
      // Matson models like AE150E, MA4INONE, MA21DCS, MA61224, IR61224, AE300E
      /\b([A-Z]{2}\d{3,5}[A-Z]*)\b/i,
      // SPi Pro25, SPi-IQ, SPiDS-200 etc (Schumacher)
      /\b(SP[iI][\s-]?(?:Pro|DS|IQ)?[\s-]?\d+[A-Z]*)\b/i,
      // SPX457, SPX458, SPX460, GX8, MT3750 etc
      /\b([A-Z]{2,}X?\d{2,}[A-Z]*)\b/,
      // G1100AU, G3500AU etc
      /\b(G\d+[A-Z]+)\b/,
      // SS4L, JMC45 etc
      /\b([A-Z]{2,}\d+[A-Z]*)\b/,
      // DS-70, DS-35 etc
      /\b([A-Z]{2}[\s-]\d+)\b/,
      // Generic alphanumeric model (ABC123, 123ABC)
      /\b([A-Z]+\d+[A-Z0-9]*|[0-9]+[A-Z]+[A-Z0-9]*)\b/i,
    ];
    
    for (const pattern of patterns) {
      const match = cleanedName.match(pattern);
      if (match) {
        // Clean up the match (remove extra spaces, normalize separators)
        return match[1].replace(/\s+/g, '-').toUpperCase();
      }
    }
    
    return 'N/A';
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
    
    // Save to localStorage
    try {
      const toSave = Object.fromEntries(newCustomizations);
      localStorage.setItem('cardCustomizations', JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save card customizations:', error);
    }
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
                <DialogTitle>
                  {extractedProducts.length > 0 ? "Review Extracted Products" : "Import Products from Category Page"}
                </DialogTitle>
                <DialogDescription>
                  {extractedProducts.length > 0 
                    ? "Review the extracted products below and import them to your catalog."
                    : "Enter a category page URL to extract all products with their titles, prices, and images. Supports pagination automatically."
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {extractedProducts.length === 0 && (
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
                )}

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
          <Card className="relative border-0 shadow-lg bg-gradient-to-br from-[#CB0000] to-red-700 text-white overflow-hidden">
            {/* Glass effect overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm font-medium uppercase tracking-wider">Total Products</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-4xl font-bold">{products?.length || 0}</p>
                    <span className="text-sm text-gray-300">items</span>
                  </div>
                  <div className="h-0.5 w-8 bg-white/50 mt-2" />
                </div>
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Package2 className="text-white" size={24} />
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center justify-between text-xs text-gray-200 mb-2">
                  <span>Catalog Growth</span>
                  <span>+{products?.length || 0} this month</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-2">
                  <div className="bg-gradient-to-r from-white/60 to-white/80 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '75%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competitor Links Card */}
          <Card className="relative border-0 shadow-lg bg-gradient-to-br from-gray-800 to-black text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium uppercase tracking-wider">Competitor Links</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-4xl font-bold">{totalCompetitorLinks}</p>
                    <span className="text-sm text-gray-400">tracked</span>
                  </div>
                  <div className="h-0.5 w-8 bg-gray-400 mt-2" />
                </div>
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Link className="text-white" size={24} />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                  <span>Coverage Rate</span>
                  <span>85% monitored</span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-2">
                  <div className="bg-gradient-to-r from-gray-400 to-gray-300 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '85%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Advantage Card */}
          <Card className="relative border-0 shadow-lg bg-gradient-to-br from-gray-700 to-gray-900 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium uppercase tracking-wider">Price Advantage</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-4xl font-bold">{priceAdvantageCount}</p>
                    <span className="text-sm text-gray-400">products</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Below competition</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <DollarSign className="text-white" size={24} />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                  <span>Competitive Edge</span>
                  <span>92% optimal</span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-400 to-green-300 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '92%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Need Adjustment Card */}
          <Card className="relative border-0 shadow-lg bg-gradient-to-br from-white to-gray-100 text-black overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#CB0000]/10 rounded-full -mr-16 -mt-16" />
            
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 text-sm font-medium uppercase tracking-wider">Need Adjustment</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-4xl font-bold">{needAdjustmentCount}</p>
                    <span className="text-sm text-gray-600">urgent</span>
                  </div>
                  <div className="h-0.5 w-8 bg-[#CB0000] mt-2" />
                </div>
                <div className="p-3 bg-[#CB0000]/20 rounded-lg backdrop-blur-sm">
                  <TrendingUp className="text-[#CB0000]" size={24} />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>Action Required</span>
                  <span>High priority</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-[#CB0000] to-red-600 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '25%' }}></div>
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
            {/* Modern Search Bar with Bulk Selection */}
            <Card className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 shadow-xl mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <Search className="h-5 w-5 text-red-600" />
                  </div>
                  <Input
                    placeholder="Search products by name or model number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 border-0 bg-transparent text-lg placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-500"
                  />
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
                
                {/* Bulk Selection Controls */}
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isAllSelected ? clearSelection : selectAllProducts}
                      className="flex items-center gap-2"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      {isAllSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                    
                    {selectedProducts.size > 0 && (
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {selectedProducts.size} of {filteredProducts.length} selected
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Add Product Button */}
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Product
                        </Button>
                      </DialogTrigger>
                    </Dialog>

                    {/* Competitor Import Button */}
                    <Dialog open={showCompetitorImportDialog} onOpenChange={setShowCompetitorImportDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="border-red-200 hover:border-red-300 hover:bg-red-50">
                          <Store className="h-4 w-4 mr-2" />
                          Import Competitor
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Import Competitor Products</DialogTitle>
                          <DialogDescription>
                            Enter a competitor's category page URL to import their products for comparison.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="competitor-url">Competitor URL</Label>
                            <Input
                              id="competitor-url"
                              value={competitorUrl}
                              onChange={(e) => setCompetitorUrl(e.target.value)}
                              placeholder="https://toolkitdepot.com.au/automotive/battery-chargers/"
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Paste a category or product listing page URL from any competitor site.
                            </p>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setShowCompetitorImportDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => {
                                if (competitorUrl) {
                                  importCompetitor.mutate({ url: competitorUrl });
                                  setShowCompetitorImportDialog(false);
                                  setCompetitorUrl("");
                                }
                              }}
                              disabled={!competitorUrl || importCompetitor.isPending}
                            >
                              {importCompetitor.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Importing...
                                </>
                              ) : (
                                "Import Products"
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {selectedProducts.size > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Bulk edit - for now just select the first product for editing
                            const firstSelectedId = Array.from(selectedProducts)[0];
                            const firstProduct = products.find(p => p.id === firstSelectedId);
                            if (firstProduct) {
                              setEditingProduct(firstProduct);
                              setShowEditDialog(true);
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Selected
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowBulkDeleteDialog(true)}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Selected
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
            {paginatedProducts.map((product) => {
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
                  <Card className={`bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border transition-all duration-300 overflow-hidden relative group hover:shadow-xl ${
                    selectedProducts.has(product.id) 
                      ? 'border-red-500 shadow-lg shadow-red-200/30 ring-2 ring-red-200' 
                      : 'border-slate-200 dark:border-slate-700 shadow-md hover:border-red-300 dark:hover:border-red-600'
                  }`}>
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 left-3 z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 rounded-full p-0 ${
                          selectedProducts.has(product.id) 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-white/80 backdrop-blur-sm hover:bg-white'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProductSelection(product.id);
                        }}
                      >
                        {selectedProducts.has(product.id) ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4 border border-gray-400 rounded-sm" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Product Image */}
                    <div className="h-48 w-full bg-white p-4 flex items-center justify-center relative">
                      {/* Floating Sale Badge on Image */}
                      {product.originalPrice && product.originalPrice > (product.price || product.ourPrice || 0) && (
                        <div className="absolute top-3 right-3 z-10">
                          <div className="relative">
                            {/* Glow effect background */}
                            <div className="absolute inset-0 bg-green-500 rounded-lg blur-sm opacity-50"></div>
                            
                            {/* Main badge */}
                            <div className="relative bg-gradient-to-r from-green-600 to-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl border border-green-500 transform hover:scale-105 transition-all duration-200">
                              <div className="flex items-center gap-1">
                                <span className="text-green-100">-{Math.round(((product.originalPrice - (product.price || product.ourPrice || 0)) / product.originalPrice) * 100)}%</span>
                                <span className="text-white font-extrabold">OFF</span>
                              </div>
                              
                              {/* Shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform -translate-x-full animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-r from-transparent to-slate-50/50 dark:to-slate-800/50">
                      <h3 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 min-h-[2.5rem] group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
                        {product.name}
                      </h3>
                      
                      {/* Price and Expand Button */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          {product.originalPrice && product.originalPrice > (product.price || product.ourPrice || 0) ? (
                            <>
                              {/* Sale Price in Green */}
                              <span className="font-bold text-2xl" style={{ color: '#008000' }}>
                                ${product.price || product.ourPrice || '0'}
                              </span>
                              {/* Original Price Strikethrough */}
                              <span className="text-xs text-gray-500 line-through">
                                ${product.originalPrice}
                              </span>
                            </>
                          ) : (
                            /* Regular Price in Red */
                            <span className="text-red-600 font-bold text-2xl">
                              ${product.price || product.ourPrice || '0'}
                            </span>
                          )}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full border-red-600 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            const newExpanded = new Set(expandedProducts);
                            if (newExpanded.has(product.id)) {
                              newExpanded.delete(product.id);
                            } else {
                              newExpanded.add(product.id);
                            }
                            setExpandedProducts(newExpanded);
                          }}
                        >
                          {expandedProducts.has(product.id) ? (
                            <Minus className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Details Section */}
                    <AnimatePresence>
                      {expandedProducts.has(product.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <CardContent className="pt-0 border-t bg-gray-50">
                            {/* Product Details */}
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Model Number</p>
                                  <p className="font-medium">{product.modelNumber || extractModelNumber(product.name)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Brand</p>
                                  <p className="font-medium">{product.brand || 'Unknown'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Category</p>
                                  <p className="font-medium">{product.category || 'Uncategorized'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Our Price</p>
                                  <p className="font-medium text-green-600">
                                    ${product.ourPrice || product.price || '0'}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Product Page Link */}
                              {product.productPageUrl && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-blue-600 font-semibold mb-1">Product Page</p>
                                      <p className="text-xs text-gray-600 truncate">{product.productPageUrl}</p>
                                    </div>
                                    <a
                                      href={product.productPageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </div>
                                </div>
                              )}
                              
                              {/* Competitor Prices */}
                              {product.competitorLinks.length > 0 && (
                                <div className="mt-4 pt-4 border-t">
                                  <p className="text-sm font-semibold text-gray-700 mb-3">
                                    Competitor Prices ({product.competitorLinks.length})
                                  </p>
                                  <div className="space-y-2">
                                    {product.competitorLinks.map((link) => (
                                      <div
                                        key={link.id}
                                        className="flex items-center justify-between p-2 bg-white rounded border"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                              {link.competitorName || "Unknown"}
                                            </Badge>
                                            {link.extractedPrice && (
                                              <span className="font-bold text-red-600">
                                                ${link.extractedPrice}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 truncate mt-1">
                                            {link.url}
                                          </p>
                                        </div>
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ml-2 p-1 hover:bg-gray-100 rounded"
                                        >
                                          <ExternalLink className="h-4 w-4 text-gray-400" />
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-4 pt-4 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 text-red-600 hover:bg-red-50"
                                  onClick={() => deleteProduct.mutate(product.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
            );
          })}
              </AnimatePresence>
          
          {paginatedProducts.length === 0 && filteredProducts.length === 0 && (
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

        {/* Pagination Controls */}
        {filteredProducts.length > itemsPerPage && (
          <div className="w-full flex flex-col items-center justify-center pt-6 mt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
            <div className="text-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Showing {Math.min(startIndex + 1, filteredProducts.length)} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
              </span>
            </div>
            <div className="flex items-center justify-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 p-0 ${
                        currentPage === pageNum 
                          ? "bg-gradient-to-r from-red-600 to-red-700 text-white border-red-600" 
                          : "hover:bg-red-50 hover:border-red-200"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
          </TabsContent>

          <TabsContent value="brands" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {uniqueBrands.map(brand => {
                const brandProducts = products.filter(p => (p.brand || 'Unknown') === brand);
                const customization = getCardCustomization(brand, 'brand');
                
                return (
                  <motion.div
                    key={brand}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer"
                    onClick={() => {
                      // Navigate to brand page - you'll need to implement this route
                      window.location.href = `/brands/${encodeURIComponent(brand)}`;
                    }}
                  >
                    <Card className="aspect-square bg-white hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-red-300 relative group">
                      {/* Product count badge */}
                      <div className="absolute -top-2 -right-2 z-10">
                        <Badge className="bg-red-600 text-white text-xs font-bold shadow-lg">
                          {brandProducts.length}
                        </Badge>
                      </div>
                      
                      {/* Edit Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/90 border-gray-300 hover:border-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCardEditor(brand, 'brand');
                        }}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      
                      <CardContent className="p-4 h-full flex flex-col items-center justify-center">
                        {customization.logoUrl ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img 
                              src={customization.logoUrl} 
                              alt={`${brand} logo`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                              <span className="text-white font-bold text-xl">
                                {brand.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Brand name on hover */}
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-xs font-medium py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
                          {brand}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {uniqueCategories.map(category => {
                const categoryProducts = products.filter(p => (p.category || 'Uncategorized') === category);
                const customization = getCardCustomization(category, 'category');
                
                return (
                  <motion.div
                    key={category}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer"
                    onClick={() => {
                      // Navigate to category page
                      window.location.href = `/categories/${encodeURIComponent(category)}`;
                    }}
                  >
                    <Card className="aspect-square bg-white hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-red-300 relative group">
                      {/* Product count badge */}
                      <div className="absolute -top-2 -right-2 z-10">
                        <Badge className="bg-red-600 text-white text-xs font-bold shadow-lg">
                          {categoryProducts.length}
                        </Badge>
                      </div>
                      
                      {/* Edit Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/90 border-gray-300 hover:border-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCardEditor(category, 'category');
                        }}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      
                      <CardContent className="p-4 h-full flex flex-col items-center justify-center">
                        {customization.logoUrl ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img 
                              src={customization.logoUrl.startsWith('/objects/') 
                                ? customization.logoUrl 
                                : customization.logoUrl}
                              alt={`${category} logo`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                              <Grid className="h-7 w-7 text-white" />
                            </div>
                          </div>
                        )}
                        
                        {/* Category name on hover */}
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-xs font-medium py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
                          {category}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="competitors" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {competitors.map(competitor => {
                const competitorProducts = products.filter(p => 
                  p.competitorLinks.some(l => (l.competitorName || 'Unknown') === competitor)
                );
                const customization = getCardCustomization(competitor, 'competitor');
                
                return (
                  <motion.div
                    key={competitor}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="cursor-pointer"
                    onClick={() => {
                      // Navigate to competitor page
                      window.location.href = `/competitors/${encodeURIComponent(competitor)}`;
                    }}
                  >
                    <Card className="aspect-square bg-white hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-red-300 relative group">
                      {/* Product count badge */}
                      <div className="absolute -top-2 -right-2 z-10">
                        <Badge className="bg-red-600 text-white text-xs font-bold shadow-lg">
                          {competitorProducts.length}
                        </Badge>
                      </div>
                      
                      {/* Edit Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/90 border-gray-300 hover:border-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCardEditor(competitor, 'competitor');
                        }}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      
                      <CardContent className="p-4 h-full flex flex-col items-center justify-center">
                        {customization.logoUrl ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img 
                              src={customization.logoUrl.startsWith('/objects/') 
                                ? customization.logoUrl 
                                : customization.logoUrl}
                              alt={`${competitor} logo`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                              <Store className="h-7 w-7 text-white" />
                            </div>
                          </div>
                        )}
                        
                        {/* Competitor name on hover */}
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 text-white text-xs font-medium py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
                          {competitor}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Card Customization Dialog */}
      <Dialog open={showCardCustomDialog} onOpenChange={setShowCardCustomDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize {editingCard?.type} Card</DialogTitle>
            <DialogDescription>
              Personalize the appearance of your {editingCard?.id} card with custom colors, title, and logo.
            </DialogDescription>
          </DialogHeader>

          {editingCard && (
            <div className="space-y-6">
              {/* Title Settings */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingCard.showTitle}
                    onCheckedChange={(checked) =>
                      setEditingCard({ ...editingCard, showTitle: checked })
                    }
                  />
                  <Label>Show Title</Label>
                </div>
                
                {editingCard.showTitle && (
                  <div>
                    <Label htmlFor="card-title">Card Title</Label>
                    <Input
                      id="card-title"
                      value={editingCard.title}
                      onChange={(e) =>
                        setEditingCard({ ...editingCard, title: e.target.value })
                      }
                      placeholder="Enter card title"
                    />
                  </div>
                )}
              </div>

              {/* Logo/Image Settings */}
              <div className="space-y-3">
                <Label>Logo/Image</Label>
                <div className="flex items-center gap-3">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880} // 5MB
                    onGetUploadParameters={async () => {
                      const response = await fetch('/api/objects/upload', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        }
                      }).then(res => res.json());
                      return {
                        method: 'PUT' as const,
                        url: response.uploadURL
                      };
                    }}
                    onComplete={async (result) => {
                      if (result.successful?.[0]) {
                        const uploadURL = result.successful[0].uploadURL;
                        const response = await fetch('/api/card-images', {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ imageURL: uploadURL })
                        }).then(res => res.json());
                        setEditingCard({ ...editingCard, logoUrl: response.objectPath });
                        toast({
                          title: "Image uploaded",
                          description: "Your image has been uploaded successfully"
                        });
                      }
                    }}
                    buttonClassName="w-full"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload Image
                  </ObjectUploader>
                  
                  {editingCard.logoUrl && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingCard({ ...editingCard, logoUrl: '' })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {editingCard.logoUrl && (
                  <div className="w-24 h-24 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <img 
                      src={editingCard.logoUrl.startsWith('/objects/') 
                        ? editingCard.logoUrl 
                        : editingCard.logoUrl
                      } 
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  Upload an image to customize your card. Supported formats: JPG, PNG, GIF
                </p>
              </div>

              {/* Background Color */}
              <div className="space-y-3">
                <Label>Background Color</Label>
                <Select
                  value={editingCard.backgroundColor}
                  onValueChange={(value) =>
                    setEditingCard({ ...editingCard, backgroundColor: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bg-white dark:bg-slate-900">Default</SelectItem>
                    <SelectItem value="bg-red-50 dark:bg-red-950">Red</SelectItem>
                    <SelectItem value="bg-blue-50 dark:bg-blue-950">Blue</SelectItem>
                    <SelectItem value="bg-green-50 dark:bg-green-950">Green</SelectItem>
                    <SelectItem value="bg-yellow-50 dark:bg-yellow-950">Yellow</SelectItem>
                    <SelectItem value="bg-purple-50 dark:bg-purple-950">Purple</SelectItem>
                    <SelectItem value="bg-pink-50 dark:bg-pink-950">Pink</SelectItem>
                    <SelectItem value="bg-indigo-50 dark:bg-indigo-950">Indigo</SelectItem>
                    <SelectItem value="bg-cyan-50 dark:bg-cyan-950">Cyan</SelectItem>
                    <SelectItem value="bg-orange-50 dark:bg-orange-950">Orange</SelectItem>
                    <SelectItem value="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">Red Gradient</SelectItem>
                    <SelectItem value="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">Blue Gradient</SelectItem>
                    <SelectItem value="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">Green Gradient</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Text Color */}
              <div className="space-y-3">
                <Label>Text Color</Label>
                <Select
                  value={editingCard.textColor}
                  onValueChange={(value) =>
                    setEditingCard({ ...editingCard, textColor: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-slate-900 dark:text-white">Default</SelectItem>
                    <SelectItem value="text-red-700 dark:text-red-300">Red</SelectItem>
                    <SelectItem value="text-blue-700 dark:text-blue-300">Blue</SelectItem>
                    <SelectItem value="text-green-700 dark:text-green-300">Green</SelectItem>
                    <SelectItem value="text-yellow-700 dark:text-yellow-300">Yellow</SelectItem>
                    <SelectItem value="text-purple-700 dark:text-purple-300">Purple</SelectItem>
                    <SelectItem value="text-pink-700 dark:text-pink-300">Pink</SelectItem>
                    <SelectItem value="text-indigo-700 dark:text-indigo-300">Indigo</SelectItem>
                    <SelectItem value="text-white">White</SelectItem>
                    <SelectItem value="text-black">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom CSS Classes */}
              <div className="space-y-3">
                <Label htmlFor="custom-styles">Custom CSS Classes</Label>
                <Input
                  id="custom-styles"
                  value={editingCard.customStyles || ''}
                  onChange={(e) =>
                    setEditingCard({ ...editingCard, customStyles: e.target.value })
                  }
                  placeholder="border-2 border-red-500 shadow-lg"
                />
                <p className="text-xs text-slate-500">
                  Add custom Tailwind CSS classes for advanced styling
                </p>
              </div>

              {/* Preview */}
              <div className="space-y-3">
                <Label>Preview</Label>
                <Card className={`${editingCard.backgroundColor} ${editingCard.customStyles} max-w-sm`}>
                  <CardHeader className="pb-4">
                    {editingCard.logoUrl && (
                      <div className="w-12 h-12 mb-2 mx-auto">
                        <img 
                          src={editingCard.logoUrl} 
                          alt="Preview logo"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    )}
                    
                    {editingCard.showTitle && (
                      <CardTitle className={`text-lg font-bold ${editingCard.textColor}`}>
                        {editingCard.title}
                      </CardTitle>
                    )}
                    
                    <CardDescription className={editingCard.textColor}>
                      Sample description text
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCardCustomDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={saveCardCustomization}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Products</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedProducts.size} selected products? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteProducts.mutate(Array.from(selectedProducts))}
              disabled={bulkDeleteProducts.isPending}
            >
              {bulkDeleteProducts.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedProducts.size} Products
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}