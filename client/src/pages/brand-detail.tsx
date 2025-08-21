
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  Plus, 
  Package2, 
  DollarSign, 
  Trash2, 
  ExternalLink,
  Loader2,
  Edit,
  Settings,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  competitorLinks: any[];
  createdAt: string;
  updatedAt: string;
}

export default function BrandDetailPage() {
  const { brandName } = useParams<{ brandName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const decodedBrandName = decodeURIComponent(brandName || '');

  // Fetch all products and filter by brand
  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products-unified"],
  });

  const brandProducts = allProducts.filter(product => 
    (product.brand || 'Unknown') === decodedBrandName
  );

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products-unified/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products-unified"] });
      toast({ title: "Product deleted" });
    },
  });

  // Update product mutation
  const updateProduct = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PUT", `/api/products-unified/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products-unified"] });
      setShowEditDialog(false);
      setEditingProduct(null);
      toast({ title: "Product updated successfully" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-slate-950 dark:via-gray-950 dark:to-slate-900">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent">
                {decodedBrandName}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
                {brandProducts.length} products in this brand
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              Brand Settings
            </Button>
            <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Total Products</p>
                  <p className="text-3xl font-bold text-white mt-2">{brandProducts.length}</p>
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
                  <p className="text-sm font-medium text-slate-300">Avg Price</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    ${brandProducts.length > 0 
                      ? (brandProducts.reduce((sum, p) => sum + (p.ourPrice || p.price || 0), 0) / brandProducts.length).toFixed(0)
                      : '0'
                    }
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Categories</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {[...new Set(brandProducts.map(p => p.category || 'Uncategorized'))].length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl shadow-lg">
                  <Package2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Tracked Links</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {brandProducts.reduce((sum, p) => sum + p.competitorLinks.length, 0)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg">
                  <ExternalLink className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {brandProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
                  {/* Product Image */}
                  <div className="h-48 w-full bg-white p-4 flex items-center justify-center">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                        <Package2 className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold line-clamp-2">
                      {product.name}
                    </CardTitle>
                    <CardDescription>
                      SKU: {product.sku} • {product.category || 'Uncategorized'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-red-600 font-bold text-2xl">
                          ${product.price || product.ourPrice || '0'}
                        </span>
                        {product.originalPrice && (
                          <span className="text-xs text-gray-500 line-through">
                            ${product.originalPrice}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline">
                        {product.competitorLinks.length} competitors
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
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
                        className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                        onClick={() => deleteProduct.mutate(product.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {brandProducts.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Package2 className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No products found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                This brand doesn't have any products yet
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Product
              </Button>
            </div>
          )}
        </div>

        {/* Edit Product Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update product details for {editingProduct?.name}
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
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Category</Label>
                    <Input
                      id="edit-category"
                      name="category"
                      defaultValue={editingProduct.category || ""}
                    />
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
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
