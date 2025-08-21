import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface Product {
  id: string;
  title: string;
  brand: string;
  model?: string;
  imageUrl?: string;
  productUrl: string;
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  if (!product) return null;

  // Mock data for demonstration
  const specs = {
    'Peak Amps': '1000A',
    'Battery Type': 'Lithium-Ion',
    'Capacity': '12V',
    'USB Ports': '2',
    'Weight': '2.4 lbs',
    'Warranty': '3 years'
  };

  const competitorPrices = [
    { competitor: 'Total Tools', price: 139, inStock: true, updated: '2h ago' },
    { competitor: 'Sydney Tools', price: 149, inStock: true, updated: '1d ago' },
    { competitor: 'Bunnings', price: 159, inStock: true, updated: '12h ago' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          <div>
            <img 
              src={product.imageUrl || '/placeholder-product.jpg'} 
              alt={product.title}
              className="w-full h-80 object-cover rounded-lg border border-slate-200"
            />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <img 
                src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150" 
                alt="Side view"
                className="w-full h-20 object-cover rounded border border-slate-200 cursor-pointer"
              />
              <img 
                src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150" 
                alt="With accessories"
                className="w-full h-20 object-cover rounded border border-slate-200 cursor-pointer"
              />
              <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150" 
                alt="In use"
                className="w-full h-20 object-cover rounded border border-slate-200 cursor-pointer"
              />
            </div>
          </div>
          
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900">{product.title}</h3>
              <p className="text-slate-600 mt-2">
                Portable lithium-ion jump starter with USB charging capability and LED flashlight
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Badge variant="outline">{product.brand}</Badge>
                {product.model && <Badge variant="secondary">{product.model}</Badge>}
                <Button variant="outline" size="sm" asChild>
                  <a href={product.productUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Site
                  </a>
                </Button>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Price History</h4>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="h-32 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📈</div>
                      <span>Price history chart would be displayed here</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Specifications</h4>
                <div className="space-y-2">
                  {Object.entries(specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-slate-600">{key}</span>
                      <span className="font-medium text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Competitor Pricing</h4>
                <div className="space-y-2">
                  {competitorPrices.map((price, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-slate-900">{price.competitor}</span>
                        <Badge variant={price.inStock ? "default" : "destructive"} className="text-xs">
                          {price.inStock ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">${price.price}.00</p>
                        <p className="text-xs text-slate-500">Updated {price.updated}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
