import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set for model number extraction");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractModelNumberWithAI(productName: string): Promise<string> {
  if (!productName) return 'N/A';
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cheaper model for simple extraction tasks
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting model numbers from product names. Extract ONLY the model number/part number from the product name, excluding brand names. 

Rules:
- Return only the model number (e.g., "SP61086", "MA61224", "GENIUS2X4", "SPi-Pro25")
- Do NOT include brand names (Schumacher, Matson, NOCO, SP Tools, etc.)
- Do NOT include descriptive text, voltages, or specifications
- If no clear model number exists, return "N/A"
- Remove parentheses and brackets from model numbers
- Keep alphanumeric characters, hyphens, and underscores only

Examples:
- "Schumacher SPi Pro25 (94065325i) 12V-25A Battery Charger" → "SPi-Pro25"
- "Matson AE12000E 12V Battery Charger" → "AE12000E"
- "SP Tools SP61086 6, 12 & 24V 26A Smart Battery Charger" → "SP61086"
- "NOCO GENIUS2X4 6V/12V 8A Battery Charger" → "GENIUS2X4"`
        },
        {
          role: "user",
          content: `Extract the model number from: "${productName}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 50
    });

    const extractedModel = response.choices[0].message.content?.trim() || 'N/A';
    
    // Basic validation - ensure it's not a brand name
    const brandNames = ['schumacher', 'matson', 'noco', 'sp tools', 'sydney tools', 'dewalt', 'makita'];
    const lowerModel = extractedModel.toLowerCase();
    
    if (brandNames.some(brand => lowerModel.includes(brand))) {
      return 'N/A';
    }
    
    return extractedModel;
    
  } catch (error) {
    console.error('Error extracting model number with AI:', error);
    return 'N/A';
  }
}

export async function bulkExtractModelNumbers(products: Array<{id: string, name: string}>): Promise<Array<{id: string, modelNumber: string}>> {
  const results = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchPromises = batch.map(async (product) => ({
      id: product.id,
      modelNumber: await extractModelNumberWithAI(product.name)
    }));
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}