// This is your new, secure "doorman" (a Netlify Serverless Function).
// This file does NOT live in /src. It lives in your /api folder at the root.
//
// This one file securely handles:
// 1. Receiving the request from your React app.
// 2. Scraping the competitor website (securely, on the server).
// 3. Calling the Google PageSpeed API (with a secure API key).
// 4. Calling the Gemini API (with a secure API key).
// 5. Bundling the final report and sending it back to React.

// --- HELPER: Fetch Website HTML ---
// We move this logic here. The server can fetch directly without any proxies.
async function fetchWebsiteHtml(websiteUrl: string): Promise<string> {
  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch website HTML (${response.status}): ${response.statusText}`);
    }
    return await response.text();
  } catch (err: any) {
    console.error('Error fetching site HTML:', err);
    return '<html><body><title>Error</title>Error: Could not fetch website content.</body></html>';
  }
}

// --- HELPER: Google PageSpeed Insights ---
// This logic is moved from googleSpeedService.ts
async function getSpeedInsights(url: string): Promise<Record<string, any>> {
  // Read the secure API key from Netlify's environment variables
  const PSI_API_KEY = process.env.PSI_API_KEY || '';
  const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  const strategy = 'MOBILE';
  const categories = ['PERFORMANCE', 'ACCESSIBILITY', 'BEST-PRACTICES', 'SEO'];
  
  let apiUrl = `${PSI_API_URL}?url=${encodeURIComponent(url)}&strategy=${strategy}`;
  categories.forEach(cat => (apiUrl += `&category=${cat}`));
  
  if (PSI_API_KEY) {
    apiUrl += `&key=${PSI_API_KEY}`;
  }

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`PageSpeed Insights API failed: ${errorData.error.message}`);
    }
    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    return {
      performance: (lighthouse.categories.performance.score || 0) * 100,
      accessibility: (lighthouse.categories.accessibility.score || 0) * 100,
      bestPractices: (lighthouse.categories['best-practices'].score || 0) * 100,
      seo: (lighthouse.categories.seo.score || 0) * 100,
      mobileFriendly: lighthouse.categories.seo.auditRefs.some(
        (audit: any) => audit.id === 'viewport' && audit.result.score === 1
      )
    };
  } catch (error: any) {
    console.error('Error fetching PageSpeed Insights:', error);
    return { error: `PageSpeed Insights failed: ${error.message}` };
  }
}

// --- HELPER: Gemini API Call ---
// This logic is moved from geminiService.ts
async function callGeminiApi(payload: Record<string, any>, retries = 3, delay = 1000): Promise<any> {
  // Read the secure API key from Netlify's environment variables
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  
  if (!GEMINI_API_KEY) {
    console.error("FATAL: GEMINI_API_KEY is not set in environment.");
    throw new Error("API configuration error.");
  }
  
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.warn(`Gemini API rate limit hit. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        return callGeminiApi(payload, retries - 1, delay * 2);
      }
      throw new Error(`API call failed with status ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];
    const contentPart = candidate?.content?.parts?.[0];

    if (contentPart?.text) {
      try {
        return JSON.parse(contentPart.text);
      } catch (e) {
        return { rawText: contentPart.text };
      }
    } else {
      console.error('Invalid response structure from Gemini API:', JSON.stringify(result, null, 2));
      throw new Error('Invalid response structure from Gemini API.');
    }
  } catch (error) {
    console.error('Error in callGeminiApi:', error);
    throw error;
  }
}

// --- HELPER: Gemini Analysis Functions ---
// These are also moved from geminiService.ts
async function analyzeGbp(businessName: string, fullAddress: string): Promise<Record<string, any>> {
  const systemPrompt = `You are a local SEO analyst... [Rest of your prompt] ... Respond ONLY with a valid JSON object. ... [Rest of your schema]`;
  const userQuery = `Find the Google Business Profile for "${businessName}" at "${fullAddress}". ... [Rest of your query]`;
  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    tools: [{ "google_search": {} }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" }
  };
  return callGeminiApi(payload);
}

async function analyzeCitations(businessName: string, fullAddress: string): Promise<Record<string, any>> {
  const systemPrompt = `You are a local citation analyst... [Rest of your prompt] ... Respond ONLY with a valid JSON object. ... [Rest of your schema]`;
  const userQuery = `Search for "${businessName}" at "${fullAddress}" on Yelp, Foursquare, and YellowPages. ... [Rest of your query]`;
  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    tools: [{ "google_search": {} }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" }
  };
  return callGeminiApi(payload);
}

async function analyzeOnPageHtml(htmlContent: string, businessName: string, websiteUrl: string): Promise<Record<string, any>> {
  const maxHtmlLength = 50000;
  const truncatedHtml = htmlContent.length > maxHtmlLength 
    ? htmlContent.substring(0, maxHtmlLength) + "\n... [HTML Truncated] ..." 
    : htmlContent;
  const systemPrompt = `You are an on-page SEO analyst... [Rest of your prompt] ... Respond ONLY with a valid JSON object. ... [Rest of your schema]`;
  const userQuery = `Analyze the following HTML for local SEO for the business "${businessName}" (${websiteUrl}). ... [Rest of your query] ... HTML: ${truncatedHtml}`;
  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" }
  };
  return callGeminiApi(payload);
}


// --- THE MAIN HANDLER ---
// This is the function Netlify will run when your React app calls `/api/get-analysis`
export default async function handler(request: Request) {
  
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    // 1. Get the data from the React app's request
    const { businessName, fullAddress, websiteUrl } = await request.json();

    if (!businessName || !fullAddress || !websiteUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // --- 2. Run all analyses in parallel (just like you did before!) ---
    
    // We first need the HTML to analyze
    const htmlContent = await fetchWebsiteHtml(websiteUrl);

    // Now run all analyses at the same time
    const [gbpResult, citationResult, onPageResult, speedResult] = await Promise.allSettled([
      analyzeGbp(businessName, fullAddress),
      analyzeCitations(businessName, fullAddress),
      analyzeOnPageHtml(htmlContent, businessName, websiteUrl),
      getSpeedInsights(websiteUrl)
    ]);

    // --- 3. Combine results into the final report ---
    const report = {
      gbpAnalysis: gbpResult.status === 'fulfilled' 
        ? gbpResult.value 
        : { error: (gbpResult.reason as Error).message },
      citationAnalysis: citationResult.status === 'fulfilled' 
        ? citationResult.value 
        : { error: (citationResult.reason as Error).message },
      onPageAnalysis: onPageResult.status === 'fulfilled' 
        ? onPageResult.value 
        : { error: (onPageResult.reason as Error).message },
      speedInsights: speedResult.status === 'fulfilled' 
        ? speedResult.value 
        : { error: (speedResult.reason as Error).message }
    };

    // --- 4. Send the complete report back to the React app ---
    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
