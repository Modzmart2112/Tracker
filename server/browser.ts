import puppeteer from "puppeteer";

export async function launchBrowser() {
  return puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--disable-gpu",
      "--disable-features=IsolateOrigins,site-per-process",
      "--js-flags=--max-old-space-size=256",
    ],
    protocolTimeout: 90_000,
  });
}

// For remote browserless connection (Octoparse-style)
export async function connectToRemoteBrowser() {
  if (!process.env.BROWSERLESS_WSS) {
    throw new Error("BROWSERLESS_WSS not configured");
  }
  
  const ws = `wss://${process.env.BROWSERLESS_WSS}/?token=${process.env.BROWSERLESS_TOKEN || 'supersecrettoken'}`;
  return puppeteer.connect({ 
    browserWSEndpoint: ws, 
    protocolTimeout: 90_000 
  });
}

// Smart browser selection
export async function getBrowser() {
  try {
    // Try remote first if configured
    if (process.env.BROWSERLESS_WSS) {
      console.log("Connecting to remote browserless...");
      return await connectToRemoteBrowser();
    }
  } catch (error) {
    console.log("Remote browser failed, falling back to local:", error.message);
  }
  
  // Fallback to local browser
  console.log("Launching local browser...");
  return await launchBrowser();
}
