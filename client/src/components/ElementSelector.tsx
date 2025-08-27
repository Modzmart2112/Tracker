import React, { useState, useEffect } from 'react';
import { toast } from '../hooks/use-toast';

interface ElementSelectorProps {
  categoryUrl: string;
  onClose: () => void;
}

interface ScrapingElement {
  id: string;
  name: string;
  selector: string;
  selectorType: 'css' | 'xpath';
  attribute: string;
  order: number;
}

export const ElementSelector: React.FC<ElementSelectorProps> = ({ categoryUrl, onClose }) => {
  const [elements, setElements] = useState<ScrapingElement[]>([]);
  const [newElement, setNewElement] = useState<ScrapingElement>({
    id: '',
    name: '',
    selector: '',
    selectorType: 'css',
    attribute: 'textContent',
    order: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());

  const handleAddElement = () => {
    if (!newElement.name || !newElement.selector) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const element: ScrapingElement = {
      ...newElement,
      id: Date.now().toString(),
      order: elements.length + 1
    };

    setElements([...elements, element]);
    setNewElement({
      id: '',
      name: '',
      selector: '',
      selectorType: 'css',
      attribute: 'textContent',
      order: 0
    });

    toast({
      title: "Success",
      description: "Element added successfully"
    });
  };

  const handleRemoveElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    toast({
      title: "Success",
      description: "Element removed successfully"
    });
  };

  const handleSaveElements = async () => {
    if (elements.length === 0) {
      toast({
        title: "No Elements",
        description: "Please add at least one element before saving",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Success",
        description: `${elements.length} elements saved successfully`
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save elements",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleElementSelection = (id: string) => {
    const newSelected = new Set(selectedElements);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedElements(newSelected);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-white/90 to-blue-50/70 backdrop-blur-xl p-6 border-b border-gray-200/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Element Configuration</h2>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {elements.length} elements configured
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200/50">
          <div className="flex items-center space-x-3">
            <span className="text-blue-600">🔗</span>
            <div>
              <p className="text-sm font-medium text-blue-800">Category URL</p>
              <p className="text-sm text-blue-600 break-all">{categoryUrl}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Element Configuration */}
        <div className="w-1/2 p-6 border-r border-gray-200/50 overflow-y-auto">
          <div className="space-y-6">
            {/* Add New Element Form */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 border border-gray-200/50 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Element</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Element Name</label>
                  <input
                    type="text"
                    value={newElement.name}
                    onChange={(e) => setNewElement({...newElement, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                    placeholder="e.g., Product Title, Price, Image"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CSS Selector</label>
                  <input
                    type="text"
                    value={newElement.selector}
                    onChange={(e) => setNewElement({...newElement, selector: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                    placeholder="e.g., .product-title, h1, [data-price]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Selector Type</label>
                    <select
                      value={newElement.selectorType}
                      onChange={(e) => setNewElement({...newElement, selectorType: e.target.value as 'css' | 'xpath'})}
                      className="w-full px-4 py-3 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                    >
                      <option value="css">CSS Selector</option>
                      <option value="xpath">XPath</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attribute</label>
                    <select
                      value={newElement.attribute}
                      onChange={(e) => setNewElement({...newElement, attribute: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                    >
                      <option value="textContent">Text Content</option>
                      <option value="href">Link (href)</option>
                      <option value="src">Image (src)</option>
                      <option value="data-price">Data Attribute</option>
                    </select>
                  </div>
                </div>
                
                <button
                  onClick={handleAddElement}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  + Add Element
                </button>
              </div>
            </div>

            {/* Configured Elements List */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 border border-gray-200/50 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Configured Elements</h3>
              
              {elements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <p className="text-sm">No elements configured yet</p>
                  <p className="text-xs text-gray-400">Add elements above to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {elements.map((element, index) => (
                    <div key={element.id} className="bg-gray-50/50 rounded-lg p-4 border border-gray-200/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-800">{element.name}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveElement(element.id)}
                          className="w-6 h-6 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-200 flex items-center justify-center text-sm"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">Selector:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                            {element.selector}
                          </code>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">Type:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {element.selectorType}
                          </span>
                          <span className="text-gray-500">Attribute:</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            {element.attribute}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2 p-6 bg-gray-50/50">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 border border-gray-200/50 shadow-lg h-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Element Preview</h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-200/50">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-blue-600">💡</span>
                  <span className="text-sm font-medium text-blue-800">How to use</span>
                </div>
                <p className="text-sm text-blue-700">
                  Select elements on the webpage to automatically generate CSS selectors. 
                  This will help you extract the right data from each product page.
                </p>
              </div>
              
              <div className="bg-green-50/50 rounded-lg p-4 border border-green-200/50">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-green-600">✅</span>
                  <span className="text-sm font-medium text-green-800">Recommended Elements</span>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Product Title</li>
                  <li>• Price</li>
                  <li>• Product Image</li>
                  <li>• SKU/Model Number</li>
                  <li>• Availability Status</li>
                </ul>
              </div>
              
              <div className="bg-orange-50/50 rounded-lg p-4 border border-orange-200/50">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-orange-600">⚠️</span>
                  <span className="text-sm font-medium text-orange-800">Important Notes</span>
                </div>
                <p className="text-sm text-orange-700">
                  Make sure your selectors are specific enough to target the right elements, 
                  but not so specific that they break if the website structure changes slightly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-white/90 backdrop-blur-xl p-6 border-t border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {elements.length > 0 ? (
              <span>Ready to save {elements.length} elements</span>
            ) : (
              <span>Add at least one element to continue</span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-200/50 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveElements}
              disabled={elements.length === 0 || isLoading}
              className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Elements'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
