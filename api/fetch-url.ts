// This file goes in the /api directory at the root of your project
// (e.g., /api/fetch-url.ts).
//
// This function acts as a proxy to bypass CORS (Cross-Origin Resource Sharing)
// restrictions that prevent your React app from directly fetching another website's HTML.
// This code is specifically formatted for Vercel or Netlify.

// The 'Request' object is globally available in this serverless environment.
export default async function handler(request: Request) {
  // Get the 'url' query parameter from the request
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Allow requests from your app
      },
    });
  }

  try {
    // Fetch the HTML content from the target URL
    const response = await fetch(url, {
      headers: {
        // Pretend to be a browser to avoid simple bot-blocking
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Return the fetched HTML
    return new Response(html, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*' // Allow all origins (your app)
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}

