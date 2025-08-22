import { execFile } from "node:child_process";

export async function renderedGet(url: string, timeoutMs = 45000): Promise<string> {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--virtual-time-budget=15000",
    "--timeout=40000",
    "--dump-dom",
    url
  ];

  return new Promise((resolve, reject) => {
    execFile("chromium", args, { timeout: timeoutMs, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.toString("utf8"));
    });
  });
}