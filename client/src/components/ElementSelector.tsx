import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Eye, 
  Target, 
  Play, 
  Save, 
  Loader2,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { toast } from './ui/use-toast';

interface ScrapingElement {
  name: string;
  selector: string;
  selectorType: 'css' | 'xpath';
  attribute?: string;
}

interface ElementSelectorProps {
  workflowId: number;
  onElementsSave: (elements: ScrapingElement[]) => void;
}

export default function ElementSelector({ workflowId, onElementsSave }: ElementSelectorProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pagePreview, setPagePreview] = useState<{ html: string; screenshot: string } | null>(null);
  const [elements, setElements] = useState<ScrapingElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<ScrapingElement | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any> | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewPage = async () => {
    if (!url) {
      toast({
        title: "Validation Error",
        description: "Please enter a URL to preview",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/preview-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      if (data.success) {
        setPagePreview({
          html: data.html,
          screenshot: `data:image/png;base64,${data.screenshot}`
        });
        toast({
          title: "Success",
          description: "Page loaded successfully"
        });
      }
    } catch (error) {
      console.error('Error previewing page:', error);
      toast({
        title: "Error",
        description: "Failed to load page",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addElement = () => {
    if (!selectedElement || !selectedElement.name || !selectedElement.selector) {
      toast({
        title: "Validation Error",
        description: "Please fill in element name and selector",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate names
    if (elements.some(el => el.name === selectedElement.name)) {
      toast({
        title: "Validation Error",
        description: "Element name already exists",
        variant: "destructive"
      });
      return;
    }

    setElements([...elements, { ...selectedElement }]);
    setSelectedElement(null);
    toast({
      title: "Success",
      description: "Element added successfully"
    });
  };

  const removeElement = (index: number) => {
    setElements(elements.filter((_, i) => i !== index));
  };

  const testElements = async () => {
    if (elements.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one element to test",
        variant: "destructive"
      });
      return;
    }

    if (!url) {
      toast({
        title: "Validation Error",
        description: "Please enter a URL to test against",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/test-elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements, testUrl: url })
      });

      const data = await response.json();
      if (data.success) {
        setTestResults(data.results);
        toast({
          title: "Success",
          description: "Elements tested successfully"
        });
      }
    } catch (error) {
      console.error('Error testing elements:', error);
      toast({
        title: "Error",
        description: "Failed to test elements",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveElements = () => {
    if (elements.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one element",
        variant: "destructive"
      });
      return;
    }

    onElementsSave(elements);
    toast({
      title: "Success",
      description: "Elements saved successfully"
    });
  };

  const startElementSelection = () => {
    setIsSelecting(true);
    // Add event listeners to the iframe for element selection
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.onload = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.addEventListener('click', handleElementClick);
            iframeDoc.addEventListener('mouseover', handleElementHover);
            iframeDoc.addEventListener('mouseout', handleElementMouseOut);
          }
        } catch (error) {
          console.error('Error setting up iframe event listeners:', error);
        }
      };
    }
  };

  const stopElementSelection = () => {
    setIsSelecting(false);
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.removeEventListener('click', handleElementClick);
          iframeDoc.removeEventListener('mouseover', handleElementHover);
          iframeDoc.removeEventListener('mouseout', handleElementMouseOut);
        }
      } catch (error) {
        console.error('Error removing iframe event listeners:', error);
      }
    }
  };

  const handleElementClick = (event: Event) => {
    if (!isSelecting) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const target = event.target as HTMLElement;
    const selector = generateSelector(target);
    
    setSelectedElement({
      name: '',
      selector,
      selectorType: 'css',
      attribute: 'textContent'
    });
    
    stopElementSelection();
  };

  const handleElementHover = (event: Event) => {
    if (!isSelecting) return;
    
    const target = event.target as HTMLElement;
    target.style.outline = '2px solid #3b82f6';
    target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
  };

  const handleElementMouseOut = (event: Event) => {
    if (!isSelecting) return;
    
    const target = event.target as HTMLElement;
    target.style.outline = '';
    target.style.backgroundColor = '';
  };

  const generateSelector = (element: HTMLElement): string => {
    // Try to generate a unique CSS selector
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    // Fallback to tag name
    return element.tagName.toLowerCase();
  };

  return (
    <div className="space-y-6">
      {/* URL Input and Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Page Preview</CardTitle>
          <CardDescription>
            Enter a product page URL to preview and select elements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://toolkitdepot.com.au/product/example"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={previewPage} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Preview
            </Button>
          </div>
          
          {pagePreview && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b flex justify-between items-center">
                <span className="text-sm font-medium">Page Preview</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={isSelecting ? "destructive" : "default"}
                    onClick={isSelecting ? stopElementSelection : startElementSelection}
                  >
                    <Target className="w-4 h-4 mr-1" />
                    {isSelecting ? "Stop Selection" : "Select Elements"}
                  </Button>
                </div>
              </div>
              <iframe
                ref={iframeRef}
                srcDoc={pagePreview.html}
                className="w-full h-96 border-0"
                title="Page Preview"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Element Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Scraping Elements</CardTitle>
          <CardDescription>
            Define the elements you want to scrape from the page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Element */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Add New Element</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="elementName">Element Name *</Label>
                <Input
                  id="elementName"
                  placeholder="e.g., Title, Price, Description"
                  value={selectedElement?.name || ''}
                  onChange={(e) => setSelectedElement(prev => ({ ...prev!, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="selectorType">Selector Type</Label>
                <select
                  id="selectorType"
                  value={selectedElement?.selectorType || 'css'}
                  onChange={(e) => setSelectedElement(prev => ({ ...prev!, selectorType: e.target.value as 'css' | 'xpath' }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="css">CSS Selector</option>
                  <option value="xpath">XPath</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="selector">Selector *</Label>
              <Input
                id="selector"
                placeholder="CSS selector or XPath expression"
                value={selectedElement?.selector || ''}
                onChange={(e) => setSelectedElement(prev => ({ ...prev!, selector: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="attribute">Attribute</Label>
              <select
                id="attribute"
                value={selectedElement?.attribute || 'textContent'}
                onChange={(e) => setSelectedElement(prev => ({ ...prev!, attribute: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="textContent">Text Content</option>
                <option value="href">Link URL</option>
                <option value="src">Image Source</option>
                <option value="innerHTML">HTML Content</option>
              </select>
            </div>
            <Button onClick={addElement} disabled={!selectedElement?.name || !selectedElement?.selector}>
              Add Element
            </Button>
          </div>

          {/* Current Elements */}
          {elements.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Current Elements</h4>
              {elements.map((element, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded">
                  <Badge variant="outline">{element.name}</Badge>
                  <span className="text-sm font-mono flex-1">{element.selector}</span>
                  <Badge variant="secondary">{element.selectorType}</Badge>
                  <Badge variant="outline">{element.attribute}</Badge>
                  <Button size="sm" variant="destructive" onClick={() => removeElement(index)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test and Save */}
      <Card>
        <CardHeader>
          <CardTitle>Test & Save</CardTitle>
          <CardDescription>
            Test your element selection and save the configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testElements} disabled={isTesting || elements.length === 0}>
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Test Elements
            </Button>
            <Button onClick={saveElements} disabled={elements.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              Save Elements
            </Button>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Test Results</h4>
              <div className="space-y-2">
                {Object.entries(testResults).map(([elementName, value]) => (
                  <div key={elementName} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Badge variant="outline">{elementName}</Badge>
                    <span className="text-sm flex-1">
                      {typeof value === 'string' && value.startsWith('Error:') ? (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {value}
                        </span>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {String(value) || '(empty)'}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
