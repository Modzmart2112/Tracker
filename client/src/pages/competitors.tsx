import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompetitorSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Plus, Globe, Trash2, Edit } from "lucide-react";
import { z } from "zod";

type CompetitorFormData = z.infer<typeof insertCompetitorSchema>;

export default function Competitors() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: competitors = [] } = useQuery({
    queryKey: ["/api/competitors"],
    queryFn: api.getCompetitors,
  });

  const form = useForm<CompetitorFormData>({
    resolver: zodResolver(insertCompetitorSchema),
    defaultValues: {
      name: "",
      siteDomain: "",
      status: "active",
      isUs: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: api.createCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Competitor created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create competitor.",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "Competitor updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update competitor.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      toast({
        title: "Success",
        description: "Competitor deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete competitor.",
        variant: "destructive",
      });
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
    form.reset(competitor);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this competitor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCompetitor(null);
    form.reset();
  };

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header 
        title="Competitors Management"
        subtitle="Manage competitor websites and monitoring"
        showActions={false}
      />
      <Navbar />
      
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Active Competitors</h2>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Competitor
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Bunnings Warehouse" {...field} />
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
                        <FormLabel>Site Domain</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., bunnings.com.au" {...field} />
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
                          <div className="text-sm text-slate-500">
                            Mark if this represents your own company
                          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitors.map((competitor: any) => (
            <Card key={competitor.id} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Globe className="text-primary" size={18} />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        {competitor.name}
                      </CardTitle>
                      <p className="text-sm text-slate-500">{competitor.siteDomain}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(competitor)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(competitor.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <Badge variant={competitor.status === "active" ? "default" : "secondary"}>
                      {competitor.status}
                    </Badge>
                  </div>
                  
                  {competitor.isUs && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Type</span>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        Our Company
                      </Badge>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">0</p>
                        <p className="text-xs text-slate-500">Pages</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">0</p>
                        <p className="text-xs text-slate-500">Products</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {competitors.length === 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <Globe className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Competitors</h3>
              <p className="text-slate-500 mb-4">
                Add competitor websites to start tracking their products and pricing.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
