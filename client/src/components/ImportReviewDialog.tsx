import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertCircle, 
  CheckCircle2, 
  Package, 
  Link, 
  X,
  Loader2,
  ShoppingCart,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Product {
  title: string;
  price: number;
  image?: string;
  url?: string;
  brand?: string;
  modelNumber?: string;
  isNew: boolean;
  matchedProduct?: {
    id: string;
    name: string;
    modelNumber: string;
  };
}

interface ImportReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: {
    competitorName: string;
    sourceUrl: string;
    totalProducts: number;
    newProducts: number;
    matchedProducts: number;
    products: Product[];
    scraperUsed?: string;
  } | null;
}

export function ImportReviewDialog({ isOpen, onClose, previewData }: ImportReviewDialogProps) {
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Confirm import mutation
  const confirmImport = useMutation({
    mutationFn: async (data: { products: Product[], competitorName: string, sourceUrl: string }) => {
      const response = await apiRequest("POST", "/api/confirm-import", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products-unified"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      
      toast({ 
        title: "Import Successful",
        description: data.message || `Successfully imported ${data.savedProducts} products`
      });
      
      onClose();
      setSelectedProducts(new Set());
    },
    onError: (error: any) => {
      toast({ 
        title: "Import Failed",
        description: error.message || "Failed to import products",
        variant: "destructive"
      });
    }
  });

  if (!previewData) return null;

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
    } else {
      const allIndices = previewData.products.map((_, index) => index);
      setSelectedProducts(new Set(allIndices));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectProduct = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
    setSelectAll(newSelected.size === previewData.products.length);
  };

  const handleConfirmImport = () => {
    const productsToImport = previewData.products.filter((_, index) => selectedProducts.has(index));
    
    if (productsToImport.length === 0) {
      toast({ 
        title: "No products selected",
        description: "Please select at least one product to import",
        variant: "destructive"
      });
      return;
    }

    confirmImport.mutate({
      products: productsToImport,
      competitorName: previewData.competitorName,
      sourceUrl: previewData.sourceUrl
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Review Import from {previewData.competitorName}</DialogTitle>
          <DialogDescription>
            Found {previewData.totalProducts} products • {previewData.newProducts} new • {previewData.matchedProducts} matched
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="flex gap-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium">{previewData.totalProducts} Total</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">{previewData.newProducts} New</span>
            </div>
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">{previewData.matchedProducts} Matched</span>
            </div>
            {previewData.scraperUsed && (
              <Badge variant="outline" className="ml-auto">
                {previewData.scraperUsed} Scraper
              </Badge>
            )}
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={selectAll}
              onCheckedChange={handleSelectAll}
            />
            <label className="text-sm font-medium cursor-pointer" onClick={handleSelectAll}>
              Select All ({previewData.products.length} products)
            </label>
            <span className="ml-auto text-sm text-slate-600">
              {selectedProducts.size} selected
            </span>
          </div>

          {/* Products List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            <div className="p-4 space-y-3">
              {previewData.products.map((product, index) => (
                <Card 
                  key={index} 
                  className={`cursor-pointer transition-colors ${
                    selectedProducts.has(index) ? 'border-blue-500 bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleSelectProduct(index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedProducts.has(index)}
                        onCheckedChange={() => handleSelectProduct(index)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-slate-100 rounded flex-shrink-0">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.title}
                            className="w-full h-full object-contain rounded"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-2">{product.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {product.modelNumber && product.modelNumber !== 'N/A' && (
                                <Badge variant="outline" className="text-xs">
                                  Model: {product.modelNumber}
                                </Badge>
                              )}
                              {product.brand && (
                                <Badge variant="outline" className="text-xs">
                                  {product.brand}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span className="font-semibold">{product.price?.toFixed(2) || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Match Status */}
                        <div className="mt-2">
                          {product.isNew ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="text-xs font-medium">New Product</span>
                            </div>
                          ) : product.matchedProduct ? (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Link className="h-3 w-3" />
                              <span className="text-xs">
                                Matches: {product.matchedProduct.name} ({product.matchedProduct.modelNumber})
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-slate-600">
              {selectedProducts.size === 0 ? (
                "Select products to import"
              ) : (
                `${selectedProducts.size} product${selectedProducts.size === 1 ? '' : 's'} will be imported`
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={confirmImport.isPending}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmImport}
                disabled={selectedProducts.size === 0 || confirmImport.isPending}
              >
                {confirmImport.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Import Selected ({selectedProducts.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}