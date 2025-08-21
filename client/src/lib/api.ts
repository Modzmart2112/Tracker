import { apiRequest } from "./queryClient";

export const api = {
  // Meta
  getMeta: () => fetch("/api/meta").then(res => res.json()),
  
  // Competitors
  getCompetitors: () => fetch("/api/competitors").then(res => res.json()),
  createCompetitor: (data: any) => apiRequest("POST", "/api/competitors", data),
  updateCompetitor: (id: string, data: any) => apiRequest("PUT", `/api/competitors/${id}`, data),
  deleteCompetitor: (id: string) => apiRequest("DELETE", `/api/competitors/${id}`),
  
  // Pages
  getPages: (competitorId?: string) => {
    const url = competitorId ? `/api/pages?competitorId=${competitorId}` : "/api/pages";
    return fetch(url).then(res => res.json());
  },
  createPage: (data: any) => apiRequest("POST", "/api/pages", data),
  deletePage: (id: string) => apiRequest("DELETE", `/api/pages/${id}`),
  
  // Products
  getProducts: (filters?: { competitorId?: string; productTypeId?: string; brand?: string }) => {
    const params = new URLSearchParams();
    if (filters?.competitorId) params.append("competitorId", filters.competitorId);
    if (filters?.productTypeId) params.append("productTypeId", filters.productTypeId);
    if (filters?.brand) params.append("brand", filters.brand);
    
    const url = `/api/products${params.toString() ? `?${params.toString()}` : ""}`;
    return fetch(url).then(res => res.json());
  },
  getProduct: (id: string) => fetch(`/api/products/${id}`).then(res => res.json()),
  createProduct: (data: any) => apiRequest("POST", "/api/products", data),
  
  // Analytics
  getBrandMatrix: (productTypeId: string) => 
    fetch(`/api/brands/matrix?productTypeId=${productTypeId}`).then(res => res.json()),
  getPriceBands: (productTypeId?: string, brand?: string) => {
    const params = new URLSearchParams();
    if (productTypeId) params.append("productTypeId", productTypeId);
    if (brand) params.append("brand", brand);
    
    const url = `/api/price-bands${params.toString() ? `?${params.toString()}` : ""}`;
    return fetch(url).then(res => res.json());
  },
  getRecentChanges: (hours: number = 24) => 
    fetch(`/api/changes/recent?hours=${hours}`).then(res => res.json()),
  getKPIMetrics: () => fetch("/api/kpi").then(res => res.json()),
  
  // Scraping
  runScrape: (data: { pageId?: string; competitorId?: string; productTypeId?: string }) =>
    apiRequest("POST", "/api/scrape/run", data),
  
  // Export
  exportCSV: (productTypeId?: string) => {
    const url = productTypeId ? `/api/export/csv?productTypeId=${productTypeId}` : "/api/export/csv";
    window.open(url, "_blank");
  }
};
