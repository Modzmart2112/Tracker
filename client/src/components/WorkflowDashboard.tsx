import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Settings, 
  Eye, 
  Database, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from './ui/use-toast';

interface Workflow {
  id: number;
  name: string;
  description: string;
  categoryUrl: string;
  competitorName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ScrapingElement {
  name: string;
  selector: string;
  selectorType: 'css' | 'xpath';
  attribute?: string;
}

interface ProductUrl {
  id: number;
  url: string;
  isActive: boolean;
  lastScraped: string | null;
}

interface ScrapingResult {
  id: number;
  scrapedData: Record<string, any>;
  scrapedAt: string;
  status: string;
  errorMessage?: string;
}

export default function WorkflowDashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    categoryUrl: '',
    competitorName: ''
  });

  // Load workflows on component mount
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      const data = await response.json();
      if (data.success) {
        setWorkflows(data.workflows);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive"
      });
    }
  };

  const createWorkflow = async () => {
    if (!newWorkflow.name || !newWorkflow.categoryUrl || !newWorkflow.competitorName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newWorkflow, userId: 1 }) // TODO: Get actual user ID
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Workflow created successfully"
        });
        setIsCreating(false);
        setNewWorkflow({ name: '', description: '', categoryUrl: '', competitorName: '' });
        loadWorkflows();
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast({
        title: "Error",
        description: "Failed to create workflow",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWorkflow = async (workflowId: number) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Workflow deleted successfully"
        });
        loadWorkflows();
        if (selectedWorkflow?.id === workflowId) {
          setSelectedWorkflow(null);
        }
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive"
      });
    }
  };

  const toggleWorkflowStatus = async (workflowId: number, isActive: boolean) => {
    try {
      const endpoint = isActive ? 'pause' : 'resume';
      const response = await fetch(`/api/workflows/${workflowId}/${endpoint}`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: `Workflow ${isActive ? 'paused' : 'resumed'} successfully`
        });
        loadWorkflows();
      }
    } catch (error) {
      console.error('Error toggling workflow status:', error);
      toast({
        title: "Error",
        description: "Failed to update workflow status",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Scraping Workflows</h1>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Workflow
        </Button>
      </div>

      {/* Create New Workflow Modal */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Scraping Workflow</CardTitle>
            <CardDescription>
              Set up a new scraping workflow for tracking competitor products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Workflow Name *</Label>
                <Input
                  id="name"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  placeholder="e.g., Toolkit Depot Automotive"
                />
              </div>
              <div>
                <Label htmlFor="competitor">Competitor Name *</Label>
                <Input
                  id="competitor"
                  value={newWorkflow.competitorName}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, competitorName: e.target.value })}
                  placeholder="e.g., Toolkit Depot"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="url">Category URL *</Label>
              <Input
                id="url"
                value={newWorkflow.categoryUrl}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, categoryUrl: e.target.value })}
                placeholder="https://toolkitdepot.com.au/automotive/adjustable-wrenches/"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                placeholder="Describe what this workflow will track..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createWorkflow} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Workflow'}
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflows List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow) => (
          <Card 
            key={workflow.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedWorkflow?.id === workflow.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedWorkflow(workflow)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <CardDescription>{workflow.competitorName}</CardDescription>
                </div>
                <Badge variant={workflow.isActive ? "default" : "secondary"}>
                  {workflow.isActive ? "Active" : "Paused"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {workflow.description || 'No description provided'}
              </p>
              <div className="text-xs text-gray-500 mb-3">
                Created: {new Date(workflow.createdAt).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={workflow.isActive ? "outline" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWorkflowStatus(workflow.id, workflow.isActive);
                  }}
                >
                  {workflow.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {workflow.isActive ? 'Pause' : 'Resume'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement run workflow
                  }}
                >
                  <Play className="w-3 h-3" />
                  Run
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteWorkflow(workflow.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow Details */}
      {selectedWorkflow && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{selectedWorkflow.name} - Details</CardTitle>
                <CardDescription>
                  Manage scraping elements, product URLs, and scheduling
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedWorkflow(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <WorkflowDetails workflow={selectedWorkflow} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WorkflowDetails({ workflow }: { workflow: Workflow }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [elements, setElements] = useState<ScrapingElement[]>([]);
  const [productUrls, setProductUrls] = useState<ProductUrl[]>([]);
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (workflow) {
      loadWorkflowDetails();
    }
  }, [workflow]);

  const loadWorkflowDetails = async () => {
    try {
      const response = await fetch(`/api/workflows/${workflow.id}`);
      const data = await response.json();
      if (data.success) {
        setElements(data.elements || []);
        setProductUrls(data.productUrls || []);
      }
    } catch (error) {
      console.error('Error loading workflow details:', error);
    }
  };

  const discoverProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workflows/${workflow.id}/discover-products`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: `Discovered ${data.count} product URLs`
        });
        loadWorkflowDetails();
      }
    } catch (error) {
      console.error('Error discovering products:', error);
      toast({
        title: "Error",
        description: "Failed to discover products",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="elements">Elements</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category URL</Label>
            <p className="text-sm text-gray-600 break-all">{workflow.categoryUrl}</p>
          </div>
          <div>
            <Label>Status</Label>
            <Badge variant={workflow.isActive ? "default" : "secondary"}>
              {workflow.isActive ? "Active" : "Paused"}
            </Badge>
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <p className="text-sm text-gray-600">{workflow.description || 'No description'}</p>
        </div>
        <Button onClick={discoverProducts} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Discover Product URLs
        </Button>
      </TabsContent>

      <TabsContent value="elements" className="space-y-4">
        <ElementSelector workflowId={workflow.id} elements={elements} onElementsChange={setElements} />
      </TabsContent>

      <TabsContent value="products" className="space-y-4">
        <ProductUrlManager workflowId={workflow.id} productUrls={productUrls} />
      </TabsContent>

      <TabsContent value="results" className="space-y-4">
        <ResultsViewer workflowId={workflow.id} results={results} />
      </TabsContent>
    </Tabs>
  );
}

function ElementSelector({ 
  workflowId, 
  elements, 
  onElementsChange 
}: { 
  workflowId: number; 
  elements: ScrapingElement[]; 
  onElementsChange: (elements: ScrapingElement[]) => void;
}) {
  const [newElement, setNewElement] = useState<ScrapingElement>({
    name: '',
    selector: '',
    selectorType: 'css',
    attribute: 'textContent'
  });

  const addElement = () => {
    if (!newElement.name || !newElement.selector) return;
    
    const updatedElements = [...elements, { ...newElement, id: Date.now() }];
    onElementsChange(updatedElements);
    setNewElement({ name: '', selector: '', selectorType: 'css', attribute: 'textContent' });
  };

  const removeElement = (index: number) => {
    const updatedElements = elements.filter((_, i) => i !== index);
    onElementsChange(updatedElements);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Element name (e.g., Title)"
          value={newElement.name}
          onChange={(e) => setNewElement({ ...newElement, name: e.target.value })}
        />
        <Input
          placeholder="CSS selector or XPath"
          value={newElement.selector}
          onChange={(e) => setNewElement({ ...newElement, selector: e.target.value })}
        />
        <select
          value={newElement.selectorType}
          onChange={(e) => setNewElement({ ...newElement, selectorType: e.target.value as 'css' | 'xpath' })}
          className="px-3 py-2 border rounded-md"
        >
          <option value="css">CSS</option>
          <option value="xpath">XPath</option>
        </select>
        <select
          value={newElement.attribute}
          onChange={(e) => setNewElement({ ...newElement, attribute: e.target.value })}
          className="px-3 py-2 border rounded-md"
        >
          <option value="textContent">Text</option>
          <option value="href">Link</option>
          <option value="src">Image</option>
        </select>
        <Button onClick={addElement}>Add</Button>
      </div>

      <div className="space-y-2">
        {elements.map((element, index) => (
          <div key={index} className="flex items-center gap-2 p-2 border rounded">
            <Badge variant="outline">{element.name}</Badge>
            <span className="text-sm font-mono">{element.selector}</span>
            <Badge variant="secondary">{element.selectorType}</Badge>
            <Button size="sm" variant="destructive" onClick={() => removeElement(index)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      {elements.length > 0 && (
        <Button onClick={() => {
          // TODO: Save elements to database
        }}>
          Save Elements
        </Button>
      )}
    </div>
  );
}

function ProductUrlManager({ workflowId, productUrls }: { workflowId: number; productUrls: ProductUrl[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Product URLs ({productUrls.length})</h3>
                 <Badge variant="outline">
           Last Updated: {productUrls.length > 0 ? 
             new Date(Math.max(...productUrls.map(p => new Date(p.lastScraped || p.createdAt).getTime()))).toLocaleDateString() : 
             'Never'
           }
         </Badge>
      </div>
      
      <div className="max-h-96 overflow-y-auto space-y-2">
        {productUrls.map((url) => (
          <div key={url.id} className="flex items-center gap-2 p-2 border rounded">
            <div className="flex-1">
              <p className="text-sm break-all">{url.url}</p>
              <p className="text-xs text-gray-500">
                Last scraped: {url.lastScraped ? new Date(url.lastScraped).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <Badge variant={url.isActive ? "default" : "secondary"}>
              {url.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsViewer({ workflowId, results }: { workflowId: number; results: ScrapingResult[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Scraping Results</h3>
        <Button variant="outline" onClick={() => {
          // TODO: Load results from API
        }}>
          <Eye className="w-4 h-4 mr-2" />
          View Results
        </Button>
      </div>
      
      {results.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No results available yet. Run the workflow to see data.</p>
      ) : (
        <div className="space-y-2">
          {results.map((result) => (
            <div key={result.id} className="p-3 border rounded">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={result.status === 'success' ? "default" : "destructive"}>
                  {result.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {result.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  {new Date(result.scrapedAt).toLocaleString()}
                </span>
              </div>
              {result.status === 'success' ? (
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(result.scrapedData, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-red-600">{result.errorMessage}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
