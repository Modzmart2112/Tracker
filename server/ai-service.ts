import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ProductAnalysis {
  brand: string;
  model: string;
  category: string;
  subcategory: string;
  specifications: string[];
  matchConfidence: number;
}

interface ProductMatch {
  isSameProduct: boolean;
  confidence: number;
  reasoning: string;
}

// Analyze a product title to extract brand, category, and specifications
export async function analyzeProductTitle(title: string): Promise<ProductAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a product data analyst specializing in tools and industrial equipment. 
          Analyze product titles and extract structured information.
          Respond with JSON in this format: 
          { 
            "brand": "brand name", 
            "model": "model number/name",
            "category": "main category",
            "subcategory": "specific type",
            "specifications": ["spec1", "spec2"],
            "matchConfidence": 0.95
          }`
        },
        {
          role: "user",
          content: `Analyze this product title: "${title}"`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      brand: result.brand || "Unknown",
      model: result.model || "",
      category: result.category || "General",
      subcategory: result.subcategory || "",
      specifications: result.specifications || [],
      matchConfidence: result.matchConfidence || 0.5
    };
  } catch (error) {
    console.error("Error analyzing product:", error);
    // Fallback to basic extraction
    const brandMatch = title.match(/^(\w+)/);
    return {
      brand: brandMatch ? brandMatch[1] : "Unknown",
      model: "",
      category: "General",
      subcategory: "",
      specifications: [],
      matchConfidence: 0.3
    };
  }
}

// Check if two products from different sources are the same
export async function matchProducts(
  product1: { title: string; price: number },
  product2: { title: string; price: number }
): Promise<ProductMatch> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a product matching expert. Compare two product listings and determine if they are the same product.
          Consider brand, model numbers, specifications, and price similarity.
          Respond with JSON: { "isSameProduct": boolean, "confidence": 0-1, "reasoning": "brief explanation" }`
        },
        {
          role: "user",
          content: `Product 1: "${product1.title}" - $${product1.price}
Product 2: "${product2.title}" - $${product2.price}

Are these the same product?`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      isSameProduct: result.isSameProduct || false,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || "Unable to determine"
    };
  } catch (error) {
    console.error("Error matching products:", error);
    return {
      isSameProduct: false,
      confidence: 0,
      reasoning: "Error during matching"
    };
  }
}

// Extract and normalize category structure from URL
export async function analyzeCategoryUrl(url: string): Promise<{
  category: string;
  subcategory: string;
  expectedBrands: string[];
}> {
  const urlParts = url.split('/');
  const categoryPath = urlParts.slice(urlParts.indexOf('category') + 1).join(' > ');
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze this category URL path and suggest the proper category structure and expected brands.
          Respond with JSON: { "category": "main", "subcategory": "specific", "expectedBrands": ["brand1", "brand2"] }`
        },
        {
          role: "user",
          content: `Category path: ${categoryPath}\nURL: ${url}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      category: result.category || "Tools",
      subcategory: result.subcategory || "",
      expectedBrands: result.expectedBrands || []
    };
  } catch (error) {
    console.error("Error analyzing category:", error);
    return {
      category: "Tools",
      subcategory: categoryPath,
      expectedBrands: []
    };
  }
}

// Bulk analyze multiple products for batch import
export async function bulkAnalyzeProducts(
  products: Array<{ title: string; price: number; url: string }>
): Promise<Array<ProductAnalysis & { originalTitle: string; price: number; url: string }>> {
  const analyses = await Promise.all(
    products.map(async (product) => {
      const analysis = await analyzeProductTitle(product.title);
      return {
        ...analysis,
        originalTitle: product.title,
        price: product.price,
        url: product.url
      };
    })
  );
  
  return analyses;
}