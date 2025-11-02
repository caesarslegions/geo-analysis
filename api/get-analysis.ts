// --- This is your "doorman" serverless function ---
// It now handles specific tasks based on a 'type' parameter.

// The 'Request' object is globally available in this environment.
export default async function handler(request: Request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get the secret API keys from Netlify's environment variables
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const psiApiKey = process.env.PSI_API_KEY;

  if (!geminiApiKey) {
    return new Response(JSON.stringify({ error: 'Gemini API key is not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get the data from the React app's request
  const { businessName, fullAddress, websiteUrl, type } = await request.json();

  if (!businessName || !fullAddress || !websiteUrl || !type) {
    return new Response(JSON.stringify({ error: 'Missing required fields or type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- API CALLING LOGIC ---
  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`;
  
  const extractJson = (text: string): any => {
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/```(json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[2]) {
        try {
          return JSON.parse(jsonMatch[2]);
        } catch (e2) {
          console.error("Failed to parse JSON from markdown block:", e2);
          throw new Error("Could not extract JSON from Gemini response.");
        }
      }
      console.error("Gemini response was not valid JSON:", text);
      throw new Error("Gemini response was not valid JSON.");
    }
  };

  async function callGeminiApi(payload: Record<string, any>, retries = 3, delay = 1000): Promise<any> {
    try {
      const response = await fetch(geminiApiUrl, {
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
        const errorText = await response.text();
        console.error(`API call failed with status ${response.status}: ${errorText}`);
        throw new Error(`API call failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];
      const contentPart = candidate?.content?.parts?.[0];

      if (contentPart?.text) {
        return extractJson(contentPart.text);
      } else {
        console.error('Invalid response structure from Gemini API:', JSON.stringify(result, null, 2));
        throw new Error('Invalid response structure from Gemini API.');
      }
    } catch (error: any) {
      console.error('Error in callGeminiApi:', error.message);
      throw error;
    }
  }

  async function fetchWebsiteHtml(websiteUrl: string): Promise<string> {
    console.log(`Fetching HTML for: ${websiteUrl}`);
    try {
      const response = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html'
        }
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

  async function getSpeedInsights(url: string): Promise<Record<string, any>> {
    let psiApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=MOBILE&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST-PRACTICES&category=SEO`;
    
    if (psiApiKey) {
      psiApiUrl += `&key=${psiApiKey}`;
    } else {
      console.warn('PSI_API_KEY is not set. Free tier usage is limited.');
    }

    try {
      const response = await fetch(psiApiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('PageSpeed Insights API error:', errorData);
        throw new Error(`PageSpeed Insights API failed: ${errorData.error.message}`);
      }
      const data = await response.json();
      const lighthouse = data.lighthouseResult;
      return {
        performance: (lighthouse.categories.performance.score || 0) * 100,
        accessibility: (lighthouse.categories.accessibility.score || 0) * 100,
        bestPractices: (lighthouse.categories['best-practices'].score || 0) * 100,
        seo: (lighthouse.categories.seo.score || 0) * 100,
      };
    } catch (error: any) {
      console.error('Error fetching PageSpeed Insights:', error);
      return { error: `PageSpeed Insights failed: ${error.message}` };
    }
  }

  // --- Prompts and Payloads ---

  async function analyzeGbp(businessName: string, fullAddress: string): Promise<Record<string, any>> {
    const systemPrompt = `You are a local SEO analyst. Respond ONLY with a valid JSON object. Schema: { "name": "...", "rating": 4.5, "reviewCount": 123, ... }`;
    const userQuery = `Find the Google Business Profile for "${businessName}" at "${fullAddress}". Get its name, rating, review count, and top 2-3 competitors. Return ONLY the JSON.`;
    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      tools: [{ "google_search": {} }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };
    return callGeminiApi(payload);
  }

  async function analyzeCitations(businessName: string, fullAddress: string): Promise<Record<string, any>> {
    const systemPrompt = `You are a citation analyst. Respond ONLY with a valid JSON object. Schema: { "yelp": { "found": true, "url": "...", "napMatch": true }, ... }`;
    const userQuery = `Search for "${businessName}" at "${fullAddress}" on Yelp, Foursquare, and YellowPages. For each: check if found, get the URL, and check for NAP match. Return ONLY the JSON.`;
    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      tools: [{ "google_search": {} }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };
    return callGeminiApi(payload);
  }

  async function analyzeOnPageHtml(htmlContent: string): Promise<Record<string, any>> {
    const maxHtmlLength = 50000;
    const truncatedHtml = htmlContent.length > maxHtmlLength 
      ? htmlContent.substring(0, maxHtmlLength) + "\n... [HTML Truncated] ..." 
      : htmlContent;

    const systemPrompt = `You are an on-page SEO analyst. Analyze the provided HTML. Respond ONLY with a valid JSON object. Schema: { "titleTag": "...", "metaDescription": "...", "hasLocalBusinessSchema": true, ... }`;
    const userQuery = `Analyze this HTML for local SEO: ${truncatedHtml}`;
    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { responseMimeType: "application/json" }
    };
    return callGeminiApi(payload);
  }

  // --- NEW: Main Task Handler ---
  // This switch runs ONE task based on the 'type' from the client.
  try {
    let result;
    switch (type) {
      case 'gbp':
        result = await analyzeGbp(businessName, fullAddress);
        break;
      case 'citations':
        result = await analyzeCitations(businessName, fullAddress);
        break;
      case 'onPage':
        // For onPage, we must fetch the HTML *first*.
        const htmlContent = await fetchWebsiteHtml(websiteUrl);
        result = await analyzeOnPageHtml(htmlContent);
        break;
      case 'speed':
        result = await getSpeedInsights(websiteUrl);
        break;
      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }

    // Send the *single* result back.
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: `Failed to generate report: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

