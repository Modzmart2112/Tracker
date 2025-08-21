import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, Package } from "lucide-react";

export default function Categories() {
  const { data: meta } = useQuery({
    queryKey: ["/api/meta"],
    queryFn: api.getMeta,
  });

  const categories = meta?.categories || [];
  const productTypes = meta?.productTypes || [];

  const getCategoryProductTypes = (categoryId: string) => {
    return productTypes.filter((pt: any) => pt.categoryId === categoryId);
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Categories Explorer"
        subtitle="Browse product categories and types"
        showActions={false}
      />
      
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category: any) => {
            const categoryProductTypes = getCategoryProductTypes(category.id);
            
            return (
              <Card key={category.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Folder className="text-primary" size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        {category.name}
                      </CardTitle>
                      <p className="text-sm text-slate-500">
                        {categoryProductTypes.length} product type{categoryProductTypes.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {categoryProductTypes.map((productType: any) => (
                      <div key={productType.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Package className="text-slate-500" size={16} />
                          <span className="font-medium text-slate-900">{productType.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      </div>
                    ))}
                    
                    {categoryProductTypes.length === 0 && (
                      <div className="text-center py-4 text-slate-500">
                        <p className="text-sm">No product types defined</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Button variant="outline" className="w-full" size="sm">
                      View Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {categories.length === 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <Folder className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Categories</h3>
              <p className="text-slate-500 mb-4">
                Get started by creating your first product category.
              </p>
              <Button>Create Category</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
