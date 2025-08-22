import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompetitorSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, Globe, Trash2, Edit, ExternalLink, RefreshCw, 
  TrendingUp, Package, AlertCircle, Image, Palette,
  Calendar, Eye, EyeOff, ShoppingBag, Tag, ChevronRight
} from "lucide-react";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

type CompetitorFormData = z.infer<typeof insertCompetitorSchema> & {
  logoUrl?: string;
  primaryColor?: string;
  description?: string;
};

interface CarouselItem {
  id: string;
  imageUrl: string;
  linkUrl?: string;
  title?: string;
  description?: string;
  promoText?: string;
  position: number;
  active: boolean;
  fingerprint?: string;
  isChanged?: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  scrapedAt: string;
}

export default function Competitors() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<any>(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [isScrapingCarousels, setIsScrapingCarousels] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: competitors = [], isLoading: loadingCompetitors } = useQuery({
    queryKey: ["/api/competitors"],
    queryFn: api.getCompetitors,
  });

  const { data: carousels = [], isLoading: loadingCarousels, refetch: refetchCarousels } = useQuery({
    queryKey: ["/api/competitor-carousels", selectedCompetitor],
    queryFn: () => selectedCompetitor ? apiRequest("GET", `/api/competitor-carousels/${selectedCompetitor}`) : Promise.resolve([]),
    enabled: !!selectedCompetitor,
  });

  const form = useForm<CompetitorFormData>({
    resolver: zodResolver(insertCompetitorSchema.extend({
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
      description: z.string().optional(),
    })),
    defaultValues: {
      name: "",
      siteDomain: "",
      status: "active",
      isUs: false,
      logoUrl: "",
      primaryColor: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: api.createCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Competitor added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add competitor", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompetitorFormData> }) =>
      api.updateCompetitor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      setIsDialogOpen(false);
      setEditingCompetitor(null);
      form.reset();
      toast({ title: "Competitor updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update competitor", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      toast({ title: "Competitor deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete competitor", variant: "destructive" });
    },
  });

  const scrapeCarouselsMutation = useMutation({
    mutationFn: (competitorId: string) => 
      apiRequest("POST", `/api/competitor-carousels/${competitorId}/scrape`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitor-carousels"] });
      setIsScrapingCarousels(false);
      toast({ title: "Carousel data updated successfully" });
    },
    onError: () => {
      setIsScrapingCarousels(false);
      toast({ title: "Failed to scrape carousel data", variant: "destructive" });
    },
  });

  const onSubmit = (data: CompetitorFormData) => {
    if (editingCompetitor) {
      updateMutation.mutate({ id: editingCompetitor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (competitor: any) => {
    setEditingCompetitor(competitor);
    form.reset({
      ...competitor,
      logoUrl: competitor.logoUrl || "",
      primaryColor: competitor.primaryColor || "",
      description: competitor.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this competitor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleScrapeCarousels = (competitorId: string) => {
    setIsScrapingCarousels(true);
    scrapeCarouselsMutation.mutate(competitorId);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCompetitor(null);
    form.reset();
  };

  const activeCompetitors = competitors.filter((c: any) => c.status === "active");
  const inactiveCompetitors = competitors.filter((c: any) => c.status !== "active");

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
            Competitor Intelligence
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor competitor websites, pricing, and promotional campaigns
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
              <Plus className="mr-2 h-4 w-4" />
              Add Competitor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCompetitor ? "Edit Competitor" : "Add New Competitor"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Total Tools" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="siteDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website Domain</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., totaltools.com.au" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/logo.png" {...field} />
                      </FormControl>
                      <FormDescription>Direct link to the company logo</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input placeholder="#CB0000" {...field} />
                            <div 
                              className="w-10 h-10 rounded border"
                              style={{ backgroundColor: field.value || "#ccc" }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <select 
                            className="w-full px-3 py-2 border rounded-md"
                            {...field}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the competitor..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isUs"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>This is our company</FormLabel>
                        <FormDescription>
                          Mark if this represents Sydney Tools
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingCompetitor ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Competitors</p>
                <p className="text-2xl font-bold">{competitors.length}</p>
              </div>
              <Globe className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Monitoring</p>
                <p className="text-2xl font-bold">{activeCompetitors.length}</p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Promotions Found</p>
                <p className="text-2xl font-bold">{carousels.length}</p>
              </div>
              <Tag className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Last Update</p>
                <p className="text-sm font-medium">Just now</p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="competitors" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="promotions">Live Promotions</TabsTrigger>
        </TabsList>

        <TabsContent value="competitors" className="space-y-4">
          {loadingCompetitors ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-12 w-12 rounded-lg mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {competitors.map((competitor: any) => (
                <motion.div
                  key={competitor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-lg transition-shadow overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {competitor.logoUrl ? (
                            <img 
                              src={competitor.logoUrl} 
                              alt={competitor.name}
                              className="w-12 h-12 rounded-lg object-contain bg-white p-1"
                            />
                          ) : (
                            <div 
                              className="w-12 h-12 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: competitor.primaryColor || "#f3f4f6" }}
                            >
                              <Globe className="h-6 w-6 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {competitor.name}
                              {competitor.isUs && (
                                <Badge variant="secondary" className="text-xs">Us</Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {competitor.siteDomain}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={competitor.status === "active" ? "default" : "secondary"}
                          className={competitor.status === "active" ? "bg-green-100 text-green-700" : ""}
                        >
                          {competitor.status}
                        </Badge>
                      </div>
                      {competitor.description && (
                        <CardDescription className="mt-2 text-xs">
                          {competitor.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <p className="text-lg font-semibold">0</p>
                          <p className="text-xs text-gray-500">Products</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <p className="text-lg font-semibold">0</p>
                          <p className="text-xs text-gray-500">Pages</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <p className="text-lg font-semibold">0</p>
                          <p className="text-xs text-gray-500">Deals</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedCompetitor(competitor.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Deals
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(competitor)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(competitor.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          
          {competitors.length === 0 && !loadingCompetitors && (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Competitors Added</h3>
                <p className="text-gray-500 mb-4">
                  Start monitoring your competition by adding their websites
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Competitor
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Promotional Campaigns</CardTitle>
                  <CardDescription>
                    Monitor competitor homepage carousels and promotional banners in real-time
                  </CardDescription>
                </div>
                {selectedCompetitor && (
                  <Button 
                    variant="outline"
                    onClick={() => handleScrapeCarousels(selectedCompetitor)}
                    disabled={isScrapingCarousels}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isScrapingCarousels ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                )}
              </div>
              
              {/* Competitor selector */}
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex space-x-2 mt-4">
                  {activeCompetitors.map((competitor: any) => (
                    <Button
                      key={competitor.id}
                      variant={selectedCompetitor === competitor.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCompetitor(competitor.id)}
                      className="flex items-center gap-2"
                    >
                      {competitor.logoUrl && (
                        <img 
                          src={competitor.logoUrl} 
                          alt={competitor.name}
                          className="w-4 h-4 rounded object-contain"
                        />
                      )}
                      {competitor.name}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardHeader>
            
            <CardContent>
              {!selectedCompetitor ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">Select a competitor to view their promotions</p>
                </div>
              ) : loadingCarousels ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-48 w-full rounded-lg" />
                  ))}
                </div>
              ) : carousels.length > 0 ? (
                <div className="space-y-4">
                  {carousels.map((carousel: CarouselItem, index: number) => (
                    <motion.div
                      key={carousel.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="flex flex-col md:flex-row relative">
                        {carousel.isChanged && (
                          <div className="absolute top-2 left-2 z-10">
                            <Badge className="bg-yellow-500 text-white animate-pulse">
                              NEW/CHANGED
                            </Badge>
                          </div>
                        )}
                        <div className="md:w-1/3">
                          <img 
                            src={carousel.imageUrl}
                            alt={carousel.title || "Promotional banner"}
                            className="w-full h-48 md:h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&h=400&fit=crop&q=80";
                            }}
                          />
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-lg flex items-center gap-2">
                                {carousel.title || "Untitled Promotion"}
                                {carousel.isChanged && (
                                  <span className="text-xs text-yellow-600 font-normal">
                                    (Updated)
                                  </span>
                                )}
                              </h4>
                              {carousel.promoText && (
                                <Badge className="mt-1 bg-red-100 text-red-700">
                                  {carousel.promoText}
                                </Badge>
                              )}
                            </div>
                            <Badge variant={carousel.active ? "default" : "secondary"}>
                              {carousel.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          
                          {carousel.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {carousel.description}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                First seen: {format(new Date(carousel.firstSeenAt || carousel.lastSeenAt), "MMM d, yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                Updated: {format(new Date(carousel.scrapedAt), "h:mm a")}
                              </span>
                            </div>
                            
                            {carousel.linkUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a 
                                  href={carousel.linkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1"
                                >
                                  View
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Tag className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">No promotional campaigns found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Click refresh to scan for the latest deals
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Feature explanation */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">How Carousel Monitoring Works</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    This feature automatically scans competitor homepages to capture their promotional banners,
                    special offers, and marketing campaigns. Stay informed about competitor strategies and 
                    respond quickly to market changes.
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3" />
                      Real-time monitoring of homepage carousels
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3" />
                      Track when promotions change or expire
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3" />
                      Historical archive of all campaigns
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}