import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Tag, Edit, Trash2, ExternalLink } from "lucide-react";
// Types defined locally for now
export interface Brand {
  id: number;
  name: string;
  description?: string;
}

export interface CatalogProduct {
  id: number;
  name: string;
  description?: string;
  brandId: number;
  categoryId: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface ProductType {
  id: number;
  name: string;
  description?: string;
}

export function CatalogPage() {
  const { toast } = useToast();
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);

  // Fetch data
  const { data: products = [], isLoading: productsLoading } = useQuery<CatalogProduct[]>({
    queryKey: ["/api/catalog/products"],
  });

  const { data: brands = [], isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: productTypes = [] } = useQuery<ProductType[]>({
    queryKey: ["/api/product-types"],
  });

  // Create brand mutation
  const createBrand = useMutation({
    mutationFn: (data: { name: string; slug: string }) => 
      apiRequest("POST", "/api/brands", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      setShowBrandDialog(false);
      toast({ title: "Brand created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create brand", variant: "destructive" });
    },
  });

  // Create/update product mutation
  const saveProduct = useMutation({
    mutationFn: (data: any) => {
      if (editingProduct) {
        return apiRequest("PATCH", `/api/catalog/products/${editingProduct.id}`, data);
      }
      return apiRequest("POST", "/api/catalog/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/products"] });
      setShowProductDialog(false);
      setEditingProduct(null);
      toast({ title: editingProduct ? "Product updated" : "Product created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save product", variant: "destructive" });
    },
  });

  const handleProductSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      brandId: formData.get("brandId"),
      categoryId: formData.get("categoryId"),
      productTypeId: formData.get("productTypeId"),
      ourSku: formData.get("ourSku"),
      name: formData.get("name"),
      quality: formData.get("quality"),
      targetPrice: formData.get("targetPrice") ? formData.get("targetPrice") as string : null,
      notes: formData.get("notes") || null,
    };
    
    saveProduct.mutate(data);
  };

  const handleBrandSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    
    createBrand.mutate({ name, slug });
  };

  const getQualityBadge = (quality: string) => {
    const colors = {
      entry: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
      mid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      pro: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    };
    return colors[quality as keyof typeof colors] || colors.entry;
  };

  if (productsLoading || brandsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading catalog...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product catalog and brands
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showBrandDialog} onOpenChange={setShowBrandDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="h-4 w-4 mr-2" />
                Add Brand
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Brand</DialogTitle>
                <DialogDescription>
                  Create a new brand for your catalog
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBrandSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Brand Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., NOCO, DeWalt"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createBrand.isPending}>
                  {createBrand.isPending ? "Creating..." : "Create Brand"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showProductDialog} onOpenChange={(open) => {
            setShowProductDialog(open);
            if (!open) setEditingProduct(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Update product details" : "Add a new product to your catalog"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brandId">Brand</Label>
                    <Select name="brandId" defaultValue={editingProduct?.brandId || ""} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="ourSku">SKU</Label>
                    <Input
                      id="ourSku"
                      name="ourSku"
                      placeholder="e.g., GB40"
                      defaultValue={editingProduct?.ourSku || ""}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., NOCO Boost Plus GB40 1000A Jump Starter"
                    defaultValue={editingProduct?.name || ""}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categoryId">Category</Label>
                    <Select name="categoryId" defaultValue={editingProduct?.categoryId || ""} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="productTypeId">Product Type</Label>
                    <Select name="productTypeId" defaultValue={editingProduct?.productTypeId || ""} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {productTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quality">Quality Tier</Label>
                    <Select name="quality" defaultValue={editingProduct?.quality || "mid"} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level</SelectItem>
                        <SelectItem value="mid">Mid Range</SelectItem>
                        <SelectItem value="pro">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="targetPrice">Target Price (Optional)</Label>
                    <Input
                      id="targetPrice"
                      name="targetPrice"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 149.99"
                      defaultValue={editingProduct?.targetPrice || ""}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Any additional notes about this product"
                    defaultValue={editingProduct?.notes || ""}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saveProduct.isPending}>
                  {saveProduct.isPending ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Brands
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brands.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Product Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productTypes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => {
          const brand = brands.find(b => b.id === product.brandId);
          const category = categories.find(c => c.id === product.categoryId);
          const productType = productTypes.find(pt => pt.id === product.productTypeId);
          
          return (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {brand?.name} • SKU: {product.ourSku}
                    </CardDescription>
                  </div>
                  <Badge className={getQualityBadge(product.quality)}>
                    {product.quality.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <Package className="h-3 w-3 mr-1" />
                    {category?.name}
                  </Badge>
                  <Badge variant="outline">
                    {productType?.name}
                  </Badge>
                </div>
                
                {product.targetPrice && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Target:</span>{" "}
                    <span className="font-semibold">${parseFloat(product.targetPrice).toFixed(2)}</span>
                  </div>
                )}
                
                {product.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.notes}
                  </p>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingProduct(product);
                      setShowProductDialog(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Navigate to listings page for this product
                      window.location.href = `/listings?productId=${product.id}`;
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Listings
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {products.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No products yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Start by adding your first product to the catalog
            </p>
            <Button onClick={() => setShowProductDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Product
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}