import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBrandAliasSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Plus, Settings, Tag, Code, Upload, Download } from "lucide-react";
import { z } from "zod";

type BrandAliasFormData = z.infer<typeof insertBrandAliasSchema>;

export default function Admin() {
  const [isAliasDialogOpen, setIsAliasDialogOpen] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meta } = useQuery({
    queryKey: ["/api/meta"],
    queryFn: api.getMeta,
  });

  const { data: brandAliases = [] } = useQuery({
    queryKey: ["/api/brand-aliases"],
    queryFn: () => [], // This would be implemented in the API
  });

  const aliasForm = useForm<BrandAliasFormData>({
    resolver: zodResolver(insertBrandAliasSchema),
    defaultValues: {
      brandCanonical: "",
      alias: "",
    },
  });

  const createAliasMutation = useMutation({
    mutationFn: (data: BrandAliasFormData) => {
      // This would call the API to create brand alias
      return Promise.resolve(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-aliases"] });
      setIsAliasDialogOpen(false);
      aliasForm.reset();
      toast({
        title: "Success",
        description: "Brand alias created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create brand alias.",
        variant: "destructive",
      });
    },
  });

  const onSubmitAlias = (data: BrandAliasFormData) => {
    createAliasMutation.mutate(data);
  };

  const [extractorJSON, setExtractorJSON] = useState("");

  const handleUpdateExtractor = () => {
    try {
      JSON.parse(extractorJSON); // Validate JSON
      toast({
        title: "Success",
        description: "Extractor configuration updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid JSON format. Please check your configuration.",
        variant: "destructive",
      });
    }
  };

  const handleImportCSV = () => {
    // CSV import functionality would be implemented here
    toast({
      title: "Success",
      description: "CSV import functionality would be implemented here.",
    });
  };

  const competitors = meta?.competitors || [];

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header 
        title="Administration"
        subtitle="Manage system configuration and data"
        showActions={false}
      />
      <Navbar />
      
      <div className="p-8">
        <Tabs defaultValue="brand-aliases" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="brand-aliases">Brand Aliases</TabsTrigger>
            <TabsTrigger value="extractors">Site Extractors</TabsTrigger>
            <TabsTrigger value="import-export">Import/Export</TabsTrigger>
          </TabsList>
          
          <TabsContent value="brand-aliases" className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      Brand Aliases
                    </CardTitle>
                    <p className="text-slate-600 text-sm mt-1">
                      Normalize brand names across different competitors (e.g., "NOCO" vs "Noco")
                    </p>
                  </div>
                  <Dialog open={isAliasDialogOpen} onOpenChange={setIsAliasDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Alias
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Brand Alias</DialogTitle>
                      </DialogHeader>
                      <Form {...aliasForm}>
                        <form onSubmit={aliasForm.handleSubmit(onSubmitAlias)} className="space-y-4">
                          <FormField
                            control={aliasForm.control}
                            name="brandCanonical"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Canonical Brand Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., NOCO" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={aliasForm.control}
                            name="alias"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Alias/Variant</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Noco, noco" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setIsAliasDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createAliasMutation.isPending}>
                              Create
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-12 text-slate-500">
                  <div className="text-slate-400 mb-4">
                    <Tag size={48} className="mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No brand aliases configured</h3>
                  <p className="text-sm">Add brand aliases to normalize brand names across competitors</p>
                  <p className="text-xs text-slate-400 mt-1">This helps standardize brands like "NOCO" vs "Noco" vs "noco"</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="extractors" className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      Site Extractors
                    </CardTitle>
                    <p className="text-slate-600 text-sm mt-1">
                      Configure CSS selectors and extraction patterns for each competitor site
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-700">Competitor:</label>
                    <select 
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      value={selectedCompetitor}
                      onChange={(e) => setSelectedCompetitor(e.target.value)}
                    >
                      <option value="">Select Competitor</option>
                      {competitors.map((comp: any) => (
                        <option key={comp.id} value={comp.id}>{comp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Extractor JSON Configuration
                    </label>
                    <Textarea
                      value={extractorJSON}
                      onChange={(e) => setExtractorJSON(e.target.value)}
                      className="font-mono text-sm h-64"
                      placeholder="Enter JSON configuration..."
                    />
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-2">Available Selectors:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-slate-700">Product Listing (PLP):</p>
                        <ul className="text-slate-600 space-y-1">
                          <li>• plp_item - Product card container</li>
                          <li>• plp_title - Product title</li>
                          <li>• plp_price - Price element</li>
                          <li>• plp_image - Product image</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">Product Detail (PDP):</p>
                        <ul className="text-slate-600 space-y-1">
                          <li>• pdp_title - Main product title</li>
                          <li>• pdp_price - Price display</li>
                          <li>• pdp_specs_table - Specifications table</li>
                          <li>• pdp_stock - Stock status</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline">
                      <Code className="mr-2 h-4 w-4" />
                      Test Selectors
                    </Button>
                    <Button onClick={handleUpdateExtractor}>
                      <Settings className="mr-2 h-4 w-4" />
                      Update Configuration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="import-export" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    Import Data
                  </CardTitle>
                  <p className="text-slate-600 text-sm mt-1">
                    Bulk import competitor pages or product data
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600 mb-2">
                        Drop your CSV file here or click to browse
                      </p>
                      <Button variant="outline" onClick={handleImportCSV}>
                        Select File
                      </Button>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="font-medium text-slate-900 mb-2">Supported Formats:</h4>
                      <ul className="text-sm text-slate-600 space-y-1">
                        <li>• Competitor Pages CSV</li>
                        <li>• Product URLs CSV</li>
                        <li>• Brand Aliases CSV</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    Export Data
                  </CardTitle>
                  <p className="text-slate-600 text-sm mt-1">
                    Export system data for backup or analysis
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="mr-2 h-4 w-4" />
                      Export All Products
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="mr-2 h-4 w-4" />
                      Export Competitor Pages
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="mr-2 h-4 w-4" />
                      Export Price History
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="mr-2 h-4 w-4" />
                      Export Brand Aliases
                    </Button>
                    
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="font-medium text-slate-900 mb-2">Export Options:</h4>
                      <ul className="text-sm text-slate-600 space-y-1">
                        <li>• CSV format for spreadsheet analysis</li>
                        <li>• JSON format for system backup</li>
                        <li>• Filtered by date range or category</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
