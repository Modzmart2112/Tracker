import React, { useState, useEffect, useRef } from 'react';
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
  attribute: 'text' | 'src' | 'href' | 'data-attribute';
  dataAttribute?: string;
  sampleText?: string;
  tag?: string;
}

interface CapturedElement {
  selector: string;
  xpath: string;
  text?: string;
  src?: string;
  tag: string;
  element: Element;
}

export const ElementSelector: React.FC<ElementSelectorProps> = ({ categoryUrl, onClose }) => {
  const [elements, setElements] = useState<ScrapingElement[]>([]);
  const [capturedElements, setCapturedElements] = useState<CapturedElement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'iframe' | 'snapshot' | 'manual'>('iframe');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Listen for messages from the iframe picker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'elementSelected') {
        const captured: CapturedElement = event.data.payload;
        setCapturedElements(prev => [...prev, captured]);
        toast({
          title: "Element Captured!",
          description: `Selected ${captured.tag} element. Now label it below.`,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    injectElementPicker();
  };

  const handleIframeError = () => {
    console.log('Iframe failed to load, switching to snapshot mode');
    setPreviewMode('snapshot');
    loadSnapshot();
  };

  const loadSnapshot = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/snapshot?url=${encodeURIComponent(categoryUrl)}`);
      
      if (!response.ok) {
        throw new Error(`Snapshot failed: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Create a blob URL for the snapshot HTML
      const blob = new Blob([html], { type: 'text/html' });
      const snapshotUrl = URL.createObjectURL(blob);
      
      // Update the iframe src to use the snapshot
      if (iframeRef.current) {
        iframeRef.current.src = snapshotUrl;
        setIframeLoaded(false); // Reset to show loading state
      }
      
    } catch (error) {
      console.error('Failed to load snapshot:', error);
      toast({
        title: "Snapshot Failed",
        description: "Could not load website preview. You can still manually configure elements below.",
        variant: "destructive"
      });
      
      // Show manual configuration option
      setPreviewMode('manual');
    } finally {
      setIsLoading(false);
    }
  };

  const injectElementPicker = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) return;

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;

    // Add picker styles
    const style = doc.createElement('style');
    style.textContent = `
      .__element-picker-highlight {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
        background-color: rgba(59, 130, 246, 0.1) !important;
        cursor: crosshair !important;
        position: relative !important;
        z-index: 10000 !important;
      }
      .__element-picker-highlight::after {
        content: 'Click to select';
        position: absolute;
        top: -30px;
        left: 0;
        background: #3b82f6;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 10001;
      }
    `;
    doc.head.appendChild(style);

    let highlightedElement: Element | null = null;

    // Mouse over - highlight element
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target === doc.documentElement || target === doc.body) return;
      
      if (highlightedElement && highlightedElement !== target) {
        highlightedElement.classList.remove('__element-picker-highlight');
      }
      
      target.classList.add('__element-picker-highlight');
      highlightedElement = target;
    };

    // Mouse out - remove highlight
    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as Element;
      target.classList.remove('__element-picker-highlight');
    };

    // Click - capture element
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as Element;
      target.classList.remove('__element-picker-highlight');
      
      const captured: CapturedElement = {
        selector: generateCSSSelector(target),
        xpath: generateXPath(target),
        text: target.textContent?.trim().slice(0, 100),
        src: (target as HTMLImageElement).src,
        tag: target.tagName.toLowerCase(),
        element: target
      };

      // Send to parent
      win.parent.postMessage({
        type: 'elementSelected',
        payload: captured
      }, '*');
    };

    // Add event listeners
    doc.addEventListener('mouseover', handleMouseOver, true);
    doc.addEventListener('mouseout', handleMouseOut, true);
    doc.addEventListener('click', handleClick, true);
  };

  const generateCSSSelector = (element: Element): string => {
    // Try to find a unique identifier
    const id = element.getAttribute('id');
    if (id) return `#${id}`;
    
    // Try data attributes
    const dataAttrs = ['data-testid', 'data-qa', 'data-selector', 'data-id'];
    for (const attr of dataAttrs) {
      const value = element.getAttribute(attr);
      if (value) return `[${attr}="${value}"]`;
    }
    
    // Build path with classes
    const path: string[] = [];
    let current = element;
    
    while (current && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();
      const classes = Array.from(current.classList).slice(0, 2).map(c => `.${c}`).join('');
      const selector = `${tag}${classes}`;
      path.unshift(selector);
      
      if (path.length >= 3) break; // Keep it reasonable
      current = current.parentElement!;
    }
    
    return path.join(' > ');
  };

  const generateXPath = (element: Element): string => {
    const path: string[] = [];
    let current = element;
    
    while (current && current !== doc.documentElement) {
      const tag = current.tagName.toLowerCase();
      let index = 1;
      let sibling = current.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
      
      path.unshift(`${tag}[${index}]`);
      current = current.parentElement!;
    }
    
    return `/${path.join('/')}`;
  };

  const addCapturedElement = (captured: CapturedElement, label: string) => {
    const newElement: ScrapingElement = {
      id: Date.now().toString(),
      name: label,
      selector: captured.selector,
      selectorType: 'css',
      attribute: captured.src ? 'src' : 'text',
      sampleText: captured.text,
      tag: captured.tag
    };
    
    setElements(prev => [...prev, newElement]);
    setCapturedElements(prev => prev.filter(el => el !== captured));
    
    toast({
      title: "Element Added!",
      description: `${label} element configured with selector: ${captured.selector}`,
    });
  };

  const handleRemoveElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
  };

  const handleSaveElements = async () => {
    if (elements.length === 0) {
      toast({
        title: "No Elements",
        description: "Please capture at least one element before saving.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Here you would save to your backend
      console.log('Saving elements:', elements);
      toast({
        title: "Success!",
        description: `${elements.length} elements saved for scraping.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save elements. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchToSnapshot = () => {
    setPreviewMode('snapshot');
    loadSnapshot();
  };

  const switchToManual = () => {
    setPreviewMode('manual');
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-white/90 to-blue-50/70 backdrop-blur-xl p-6 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Configure Elements for Scraping</h2>
            <p className="text-gray-600 mt-1">Hover over elements to highlight, click to capture selectors</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Hover to highlight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Click to capture</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-sm text-gray-600">{elements.length} elements configured</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Element Configuration */}
        <div className="w-1/2 p-6 border-r border-gray-200/50 overflow-y-auto">
          {/* Captured Elements */}
          {capturedElements.length > 0 && (
            <div className="bg-blue-50/50 backdrop-blur-xl rounded-xl p-6 border border-blue-200/50 shadow-lg mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Captured Elements</h3>
              <div className="space-y-3">
                {capturedElements.map((captured, index) => (
                  <div key={index} className="bg-white/80 rounded-lg p-4 border border-blue-200/50">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{captured.tag.toUpperCase()}</div>
                        <div className="text-xs text-gray-600 break-all">{captured.selector}</div>
                        {captured.text && (
                          <div className="text-xs text-gray-500 mt-1">"{captured.text}"</div>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Label (e.g., Title, Price)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            addCapturedElement(captured, e.currentTarget.value.trim());
                          }
                        }}
                      />
                      <button
                        onClick={() => addCapturedElement(captured, `Element ${index + 1}`)}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configured Elements */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 border border-gray-200/50 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configured Elements</h3>
            {elements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🎯</div>
                <p>No elements configured yet</p>
                <p className="text-sm">Hover and click on elements in the preview to capture them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {elements.map((element) => (
                  <div key={element.id} className="bg-gray-50/50 rounded-lg p-4 border border-gray-200/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{element.name}</div>
                        <div className="text-sm text-gray-600">{element.selector}</div>
                        {element.sampleText && (
                          <div className="text-xs text-gray-500 mt-1">Sample: "{element.sampleText}"</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveElement(element.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Website Preview */}
        <div className="w-1/2 p-6 bg-gray-50/50">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl p-6 border border-gray-200/50 shadow-lg h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Website Preview</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode('iframe')}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    previewMode === 'iframe' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Live
                </button>
                <button
                  onClick={switchToSnapshot}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    previewMode === 'snapshot' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Snapshot
                </button>
                <button
                  onClick={switchToManual}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    previewMode === 'manual' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>
            
            <div className="relative h-full">
              {previewMode === 'iframe' ? (
                <iframe
                  ref={iframeRef}
                  src={categoryUrl}
                  className="w-full h-full border border-gray-300 rounded-lg"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  title="Website Preview"
                />
              ) : previewMode === 'snapshot' ? (
                <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-2">📸</div>
                    <p>Snapshot mode</p>
                    <p className="text-sm">Server-side rendering for blocked sites</p>
                    {isLoading && (
                      <div className="mt-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <p>Generating snapshot...</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-gray-100 rounded-lg p-6">
                  <div className="text-center text-gray-500 mb-6">
                    <div className="text-4xl mb-2">✏️</div>
                    <p>Manual Configuration Mode</p>
                    <p className="text-sm">Enter CSS selectors manually when preview fails</p>
                  </div>
                  
                  <div className="bg-white/80 rounded-lg p-4 border border-gray-200/50">
                    <h4 className="font-medium text-gray-900 mb-3">Quick Element Setup</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="Element Name (e.g., Title)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          placeholder="CSS Selector (e.g., h1, .product-title)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
                          Add
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Tip: Use browser dev tools to inspect elements and copy selectors
                    </p>
                  </div>
                </div>
              )}
              
              {!iframeLoaded && previewMode === 'iframe' && (
                <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading website...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-white/90 backdrop-blur-xl p-6 border-t border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {elements.length} elements configured • Ready to save
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveElements}
              disabled={isLoading || elements.length === 0}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : `Save ${elements.length} Elements`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
