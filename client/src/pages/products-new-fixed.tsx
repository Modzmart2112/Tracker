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
}

interface CardCustomization {
  backgroundColor: string;
  title: string;
  logoUrl?: string;
}

export default function ProductsNewPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [cardCustomizations, setCardCustomizations] = useState<Record<string, CardCustomization>>({});
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [customizationTarget, setCustomizationTarget] = useState<{ name: string; type: 'brand' | 'category' | 'competitor' } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  // Form states
  const [newProduct, setNewProduct] = useState({
    sku: "",
    name: "",
    ourPrice: "",
    originalPrice: "",
    brand: "",
    category: "",
    image: "",
    competitorLinks: [{ url: "", competitorName: "" }]
  });

  // Fetch products
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/products'],
  });

  // Mutations
  const addProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setShowAddDialog(false);
      setNewProduct({
        sku: "",
        name: "",
        ourPrice: "",
        originalPrice: "",
        brand: "",
        category: "",
        image: "",
        competitorLinks: [{ url: "", competitorName: "" }]
      });
      toast({
        title: "Success",
        description: "Product added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive",
      });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setShowEditDialog(false);
      setEditingProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/products/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(
      ids.map(id => apiRequest(`/api/products/${id}`, { method: 'DELETE' }))
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setSelectedProducts(new Set());
      setShowBulkDeleteDialog(false);
      toast({
        title: "Success",
        description: `${selectedProducts.size} products deleted successfully`,
      });
    }
  });

  // Utility functions
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const getLowestCompetitorPrice = (competitorLinks: CompetitorLink[]) => {
    const prices = competitorLinks
      .map(link => link.extractedPrice)
      .filter((price): price is number => price !== undefined);
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const getPriceStatus = (ourPrice?: number, competitorPrice?: number | null) => {
    if (!ourPrice || !competitorPrice) return 'unknown';
    const difference = ((ourPrice - competitorPrice) / competitorPrice) * 100;
    if (difference <= -5) return 'lower';
    if (difference >= 5) return 'higher';
    return 'competitive';
  };

  const getCardCustomization = (name: string, type: 'brand' | 'category' | 'competitor'): CardCustomization => {
    const key = `${type}-${name}`;
    return cardCustomizations[key] || {
      backgroundColor: 'bg-white',
      title: name
    };
  };

  // Filter and pagination logic
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBrand = !selectedBrand || product.brand === selectedBrand;
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    return matchesSearch && matchesBrand && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Get unique values for filters
  const uniqueBrands = [...new Set(products.map((p: Product) => p.brand).filter(Boolean))];
  const uniqueCategories = [...new Set(products.map((p: Product) => p.category).filter(Boolean))];

  const addCompetitorLink = () => {
    setNewProduct(prev => ({
      ...prev,
      competitorLinks: [...prev.competitorLinks, { url: "", competitorName: "" }]
    }));
  };

  const removeCompetitorLink = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      competitorLinks: prev.competitorLinks.filter((_, i) => i !== index)
    }));
  };

  const updateCompetitorLink = (index: number, field: 'url' | 'competitorName', value: string) => {
    setNewProduct(prev => ({
      ...prev,
      competitorLinks: prev.competitorLinks.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      sku: newProduct.sku,
      name: newProduct.name,
      ourPrice: newProduct.ourPrice ? parseFloat(newProduct.ourPrice) : undefined,
      price: newProduct.ourPrice ? parseFloat(newProduct.ourPrice) : undefined,
      originalPrice: newProduct.originalPrice ? parseFloat(newProduct.originalPrice) : undefined,
      brand: newProduct.brand || undefined,
      category: newProduct.category || undefined,
      image: newProduct.image || undefined,
      competitorLinks: newProduct.competitorLinks
        .filter(link => link.url && link.competitorName)
        .map(link => ({
          id: Math.random().toString(36).substr(2, 9),
          url: link.url,
          competitorName: link.competitorName,
          status: "pending" as const
        }))
    };

    addProductMutation.mutate(productData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-red-600" />
          <span className="text-lg font-medium">Loading products...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
            Product Catalog
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your product catalog and track competitor pricing across {products.length} products
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Package2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Products</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-600 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Active Brands</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{uniqueBrands.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-600 rounded-xl">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Categories</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{uniqueCategories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-600 rounded-xl">
                <Link className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Tracked Links</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {products.reduce((sum: number, p: Product) => sum + p.competitorLinks.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            All Products
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Brands
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Competitors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {/* Controls */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select
                    value={selectedBrand || 'all'}
                    onValueChange={(value) => setSelectedBrand(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {uniqueBrands.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedCategory || 'all'}
                    onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {uniqueCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedProducts.size === products.length) {
                        setSelectedProducts(new Set());
                      } else {
                        setSelectedProducts(new Set(products.map((p: Product) => p.id)));
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    {selectedProducts.size === products.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                </div>
              </div>
              
              {/* Bulk Actions */}
              {selectedProducts.size > 0 && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedProducts.size} product{selectedProducts.size === 1 ? '' : 's'} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const firstSelectedId = Array.from(selectedProducts)[0];
                          const firstProduct = products.find((p: Product) => p.id === firstSelectedId);
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
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Grid and Pagination Container */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {paginatedProducts.map((product: Product) => {
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

                        {/* Edit Button */}
                        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-full p-0 bg-white/80 backdrop-blur-sm hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProduct(product);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Sale Badge */}
                        {product.originalPrice && product.price && product.price < product.originalPrice && (
                          <div className="absolute top-14 left-3 z-10">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                            >
                              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                            </motion.div>
                          </div>
                        )}

                        <CardContent 
                          className="p-0 cursor-pointer"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowProductModal(true);
                          }}
                        >
                          {/* Product Image */}
                          <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 relative overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package2 className="h-16 w-16 text-slate-400" />
                              </div>
                            )}
                            
                            {/* Price Status Indicator */}
                            <div className={`absolute bottom-3 right-3 w-3 h-3 rounded-full ${
                              priceStatus === 'competitive' ? 'bg-green-500' :
                              priceStatus === 'higher' ? 'bg-red-500' :
                              priceStatus === 'lower' ? 'bg-blue-500' : 'bg-gray-400'
                            }`} />
                          </div>

                          {/* Product Details */}
                          <div className="p-4">
                            <div className="mb-3">
                              <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-red-600 transition-colors">
                                {product.name}
                              </h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {product.sku}</p>
                            </div>

                            {/* Brand and Category */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              {product.brand && (
                                <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-700">
                                  {product.brand}
                                </Badge>
                              )}
                              {product.category && (
                                <Badge variant="outline" className="text-xs">
                                  {product.category}
                                </Badge>
                              )}
                            </div>

                            {/* Pricing */}
                            <div className="space-y-2">
                              {/* Our Price */}
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Our Price:</span>
                                <div className="flex items-center gap-2">
                                  {product.originalPrice && product.price && product.price < product.originalPrice ? (
                                    <>
                                      <span className="text-xs text-slate-400 line-through">
                                        ${product.originalPrice.toFixed(2)}
                                      </span>
                                      <span className="text-sm font-bold text-green-600">
                                        ${product.price.toFixed(2)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                      ${(product.ourPrice || product.price || 0).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Competitor Price */}
                              {lowestPrice && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Lowest Competitor:</span>
                                  <span className="text-sm font-bold text-orange-600">
                                    ${lowestPrice.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Competitor Links Count */}
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Tracked on:</span>
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {product.competitorLinks.length} competitor{product.competitorLinks.length === 1 ? '' : 's'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {/* Empty State */}
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
              <div className="flex flex-col items-center justify-center pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
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
          </div>
        </TabsContent>

        <TabsContent value="brands" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {uniqueBrands.map(brand => {
              const brandProducts = products.filter((p: Product) => (p.brand || 'Unknown') === brand);
              const customization = getCardCustomization(brand, 'brand');
              
              return (
                <motion.div
                  key={brand}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="cursor-pointer"
                  onClick={() => {
                    window.location.href = `/brands/${encodeURIComponent(brand)}`;
                  }}
                >
                  <Card className="aspect-square bg-white hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-red-300 relative group">
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge className="bg-red-600 text-white text-xs font-bold shadow-lg">
                        {brandProducts.length}
                      </Badge>
                    </div>
                    
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
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center mb-3 mx-auto">
                            <Tag className="h-6 w-6 text-red-600" />
                          </div>
                          <h3 className="font-semibold text-sm text-center text-slate-900 line-clamp-2">
                            {customization.title}
                          </h3>
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomizationTarget({ name: brand, type: 'brand' });
                          setShowCustomizationDialog(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uniqueCategories.map(category => {
              const categoryProducts = products.filter((p: Product) => (p.category || 'Uncategorized') === category);
              const customization = getCardCustomization(category, 'category');
              
              return (
                <motion.div
                  key={category}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={() => {
                    window.location.href = `/categories/${encodeURIComponent(category)}`;
                  }}
                >
                  <Card className="bg-white hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-red-300 relative group">
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge className="bg-red-600 text-white text-xs font-bold shadow-lg">
                        {categoryProducts.length}
                      </Badge>
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-8 w-8 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                            {customization.title}
                          </h3>
                          <p className="text-sm text-slate-500 mb-3">
                            {categoryProducts.length} product{categoryProducts.length === 1 ? '' : 's'}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {[...new Set(categoryProducts.map(p => p.brand).filter(Boolean))].slice(0, 3).map(brand => (
                              <Badge key={brand} variant="secondary" className="text-xs">
                                {brand}
                              </Badge>
                            ))}
                            {[...new Set(categoryProducts.map(p => p.brand).filter(Boolean))].length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{[...new Set(categoryProducts.map(p => p.brand).filter(Boolean))].length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomizationTarget({ name: category, type: 'category' });
                          setShowCustomizationDialog(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="competitors" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...new Set(products.flatMap((p: Product) => p.competitorLinks.map(link => link.competitorName)))].map(competitor => {
              const competitorLinks = products.flatMap((p: Product) => 
                p.competitorLinks.filter(link => link.competitorName === competitor)
              );
              const customization = getCardCustomization(competitor, 'competitor');
              
              return (
                <motion.div
                  key={competitor}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={() => {
                    window.location.href = `/competitors/${encodeURIComponent(competitor)}`;
                  }}
                >
                  <Card className="bg-white hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-red-300 relative group">
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge className="bg-red-600 text-white text-xs font-bold shadow-lg">
                        {competitorLinks.length}
                      </Badge>
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Store className="h-8 w-8 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                            {customization.title}
                          </h3>
                          <p className="text-sm text-slate-500 mb-3">
                            {competitorLinks.length} tracked product{competitorLinks.length === 1 ? '' : 's'}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {competitorLinks.filter(link => link.status === 'success').length > 0 && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  <span className="text-xs text-green-600">
                                    {competitorLinks.filter(link => link.status === 'success').length} active
                                  </span>
                                </div>
                              )}
                              {competitorLinks.filter(link => link.status === 'error').length > 0 && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-xs text-red-600">
                                    {competitorLinks.filter(link => link.status === 'error').length} errors
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomizationTarget({ name: competitor, type: 'competitor' });
                          setShowCustomizationDialog(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your catalog with competitor tracking links.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="e.g., BC-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="e.g., Stanley"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={newProduct.name}
                onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 12V Battery Charger"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Automotive"
                />
              </div>
              <div>
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  value={newProduct.image}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ourPrice">Our Price ($)</Label>
                <Input
                  id="ourPrice"
                  type="number"
                  step="0.01"
                  value={newProduct.ourPrice}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, ourPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="originalPrice">Original Price ($)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  value={newProduct.originalPrice}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, originalPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Competitor Links</Label>
                <Button type="button" onClick={addCompetitorLink} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </div>
              
              <div className="space-y-3">
                {newProduct.competitorLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Competitor Name"
                        value={link.competitorName}
                        onChange={(e) => updateCompetitorLink(index, 'competitorName', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Product URL"
                        value={link.url}
                        onChange={(e) => updateCompetitorLink(index, 'url', e.target.value)}
                      />
                    </div>
                    {newProduct.competitorLinks.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCompetitorLink(index)}
                        className="px-3"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addProductMutation.isPending}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              >
                {addProductMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Product'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}