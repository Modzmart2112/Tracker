import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, FolderOpen, Package2, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductType {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
}

interface Competitor {
  id: string;
  name: string;
  domain: string;
  active: boolean;
}

export function CatalogManagerPage() {
  const { toast } = useToast();
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showProductTypeDialog, setShowProductTypeDialog] = useState(false);
  const [showCompetitorDialog, setShowCompetitorDialog] = useState(false);

  // Fetch data
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: productTypes = [], isLoading: productTypesLoading } = useQuery<ProductType[]>({
    queryKey: ["/api/product-types"],
  });

  const { data: competitors = [], isLoading: competitorsLoading } = useQuery<Competitor[]>({
    queryKey: ["/api/competitors"],
  });

  // Create category mutation
  const createCategory = useMutation({
    mutationFn: (data: { name: string; slug: string }) =>
      apiRequest("POST", "/api/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowCategoryDialog(false);
      toast({ title: "Category created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  // Create product type mutation
  const createProductType = useMutation({
    mutationFn: (data: { categoryId: string; name: string; slug: string }) =>
      apiRequest("POST", "/api/product-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-types"] });
      setShowProductTypeDialog(false);
      toast({ title: "Product type created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create product type", variant: "destructive" });
    },
  });

  // Create competitor mutation
  const createCompetitor = useMutation({
    mutationFn: (data: { name: string; domain: string; active: boolean }) =>
      apiRequest("POST", "/api/competitors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      setShowCompetitorDialog(false);
      toast({ title: "Competitor created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create competitor", variant: "destructive" });
    },
  });

  // Delete mutations
  const deleteCategory = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category deleted" });
    },
  });

  const deleteProductType = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/product-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-types"] });
      toast({ title: "Product type deleted" });
    },
  });

  const deleteCompetitor = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/competitors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      toast({ title: "Competitor deleted" });
    },
  });

  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    createCategory.mutate({ name, slug });
  };

  const handleProductTypeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const categoryId = formData.get("categoryId") as string;
    createProductType.mutate({ categoryId, name, slug });
  };

  const handleCompetitorSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const domain = formData.get("domain") as string;
    createCompetitor.mutate({ name, domain, active: true });
  };

  if (categoriesLoading || productTypesLoading || competitorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading catalog manager...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Catalog Manager</h1>
        <p className="text-muted-foreground mt-1">
          Manage categories, product types, and competitors
        </p>
      </div>

      {/* Categories Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Organize products into categories</CardDescription>
            </div>
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription>
                    Create a new product category
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Category Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Automotive, Tools"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createCategory.isPending}>
                    {createCategory.isPending ? "Creating..." : "Create Category"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{category.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCategory.mutate(category.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-4">
                No categories yet. Add your first category to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Types Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Product Types</CardTitle>
              <CardDescription>Define specific product types within categories</CardDescription>
            </div>
            <Dialog open={showProductTypeDialog} onOpenChange={setShowProductTypeDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Product Type</DialogTitle>
                  <DialogDescription>
                    Create a new product type within a category
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleProductTypeSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="categoryId">Category</Label>
                    <Select name="categoryId" required>
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
                    <Label htmlFor="name">Product Type Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Jump Starters, Power Tools"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createProductType.isPending}>
                    {createProductType.isPending ? "Creating..." : "Create Product Type"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {productTypes.map(productType => {
              const category = categories.find(c => c.id === productType.categoryId);
              return (
                <div key={productType.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{productType.name}</span>
                      <span className="text-xs text-muted-foreground block">
                        {category?.name}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProductType.mutate(productType.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {productTypes.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-4">
                No product types yet. Add categories first, then create product types.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Competitors Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Competitors</CardTitle>
              <CardDescription>Track competitor websites and their products</CardDescription>
            </div>
            <Dialog open={showCompetitorDialog} onOpenChange={setShowCompetitorDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Competitor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Competitor</DialogTitle>
                  <DialogDescription>
                    Add a competitor to track their products and prices
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCompetitorSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Competitor Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Bunnings, Supercheap Auto"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="domain">Website Domain</Label>
                    <Input
                      id="domain"
                      name="domain"
                      placeholder="e.g., bunnings.com.au"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createCompetitor.isPending}>
                    {createCompetitor.isPending ? "Creating..." : "Create Competitor"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {competitors.map(competitor => (
              <div key={competitor.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{competitor.name}</span>
                    <span className="text-xs text-muted-foreground block">
                      {competitor.domain}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {competitor.active && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      Active
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCompetitor.mutate(competitor.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {competitors.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-4">
                No competitors yet. Add competitors to track their products and prices.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}