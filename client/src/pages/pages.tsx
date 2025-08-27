import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Schema defined locally for now
export const insertPageSchema = {
  url: "",
  title: "",
  content: ""
};
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Plus, Globe, Trash2, Play, Clock } from "lucide-react";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";

type PageFormData = z.infer<typeof insertPageSchema>;

export default function Pages() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meta } = useQuery({
    queryKey: ["/api/meta"],
    queryFn: api.getMeta,
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["/api/pages"],
    queryFn: () => api.getPages(),
  });

  const form = useForm<PageFormData>({
    resolver: zodResolver(insertPageSchema),
    defaultValues: {
      url: "",
      pageType: "PLP",
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: api.createPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Page added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add page.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      toast({
        title: "Success",
        description: "Page deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete page.",
        variant: "destructive",
      });
    },
  });

  const scrapeMutation = useMutation({
    mutationFn: (pageId: string) => api.runScrape({ pageId }),
    onSuccess: () => {
      toast({
        title: "Scraping Started",
        description: "Scraping task has been queued successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start scraping task.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PageFormData) => {
    createMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this page?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleScrape = (pageId: string) => {
    scrapeMutation.mutate(pageId);
  };

  const getCompetitorName = (competitorId: string) => {
    return meta?.competitors?.find((c: any) => c.id === competitorId)?.name || "Unknown";
  };

  const getCategoryName = (categoryId: string) => {
    return meta?.categories?.find((c: any) => c.id === categoryId)?.name || "Unknown";
  };

  const getProductTypeName = (productTypeId: string) => {
    return meta?.productTypes?.find((pt: any) => pt.id === productTypeId)?.name || "Unknown";
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="p-8 animate-fade-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Scraping Pages</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Scraping Page</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Page URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/products" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="competitorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competitor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select competitor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {meta?.competitors?.map((competitor: any) => (
                              <SelectItem key={competitor.id} value={competitor.id}>
                                {competitor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {meta?.categories?.map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {meta?.productTypes?.map((productType: any) => (
                              <SelectItem key={productType.id} value={productType.id}>
                                {productType.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pageType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Page Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select page type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PLP">Product Listing Page (PLP)</SelectItem>
                            <SelectItem value="PDP">Product Detail Page (PDP)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      Add Page
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {pages.length > 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Scraping Pages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">URL</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Competitor</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Type</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-700">Status</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-700">Last Run</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pages.map((page: any) => (
                      <tr key={page.id} className="hover:bg-slate-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <Globe size={16} className="text-slate-400" />
                            <a 
                              href={page.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 truncate max-w-xs"
                            >
                              {page.url}
                            </a>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {getCompetitorName(page.competitorId)}
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {getCategoryName(page.categoryId)} › {getProductTypeName(page.productTypeId)}
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline">
                            {page.pageType}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge variant={page.active ? "default" : "secondary"}>
                            {page.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center text-sm text-slate-500">
                          {page.lastScrapedAt ? (
                            formatDistanceToNow(new Date(page.lastScrapedAt), { addSuffix: true })
                          ) : (
                            "Never"
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleScrape(page.id)}
                              disabled={scrapeMutation.isPending}
                            >
                              <Play size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(page.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <Globe className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Pages Added</h3>
              <p className="text-slate-500 mb-4">
                Add competitor product pages to start scraping and collecting data.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
