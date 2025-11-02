// --- NEW FIREBASE IMPORTS ---
import { db, appId, getUserId } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  serverTimestamp,
  query
} from 'firebase/firestore';

// This is the main data structure for your report.
export interface GeoReport {
  gbpAnalysis: Record<string, any>;
  citationAnalysis: Record<string, any>;
  onPageAnalysis: Record<string, any>;
  speedInsights: Record<string, any>;
}

export interface AnalysisDoc {
  id: string;
  userId: string;
  businessName: string;
  createdAt: Date;
  report: GeoReport;
}

// --- FIX: Add placeholder exports for other components ---
// Your components `CompetitorTable` and `RecommendationCard` are likely
// importing these types, so we'll provide placeholders.
export interface Analysis { [key: string]: any }
export interface Recommendation { [key: string]: any }
// --------------------------------------------------------


// --- NEW: Helper function to save the report (No changes needed) ---
async function saveAnalysis(userId: string, report: GeoReport, businessName: string, websiteUrl: string): Promise<string> {
  try {
    const collectionPath = `artifacts/${appId}/users/${userId}/analyses`;
    const analysesCollection = collection(db, collectionPath);

    const docRef = await addDoc(analysesCollection, {
      userId: userId,
      businessName: businessName,
      websiteUrl: websiteUrl,
      createdAt: serverTimestamp(),
      report: report
    });

    console.log("Report saved with ID: ", docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error("Error saving report to Firestore:", error);
    throw new Error(`Failed to save report: ${error.message}`);
  }
}


// --- !! UPDATED !! ---
// This function is now much simpler. It calls your secure "doorman"
// serverless function instead of calling Gemini/PageSpeed directly.
export async function generateRealReport(
  businessName: string,
  fullAddress: string,
  websiteUrl: string
): Promise<GeoReport> {
  console.log('Starting real report generation...');

  try {
    // --- Step 1: Call your secure Netlify function ---
    // This ONE call replaces all the separate calls to Gemini, PageSpeed, and fetching HTML.
    const response = await fetch('/api/get-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessName,
        fullAddress,
        websiteUrl
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Failed to generate report (${response.status})`);
    }

    const report: GeoReport = await response.json();
    
    console.log('Report generation complete:', report);

    // --- Step 2: Get User ID and Save Report (No changes) ---
    try {
      const userId = await getUserId();
      await saveAnalysis(userId, report, businessName, websiteUrl);
    } catch (saveError: any) {
      console.error("Failed to save report, but returning to user:", saveError.message);
    }

    return report;

  } catch (error: any) {
    console.error('Fatal error during report generation:', error);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

// --- FIX: Restored your full mock data function ---
export function generateMockReport(): GeoReport {
  console.warn('Generating MOCK report');
  return {
    gbpAnalysis: {
      name: 'Mock Business',
      rating: 4.5,
      reviews: 120,
      claimed: true,
      competitors: [{ name: 'Mock Competitor 1' }, { name: 'Mock Competitor 2' }]
    },
    citationAnalysis: {
      yelp: { found: true, napMatch: true },
      foursquare: { found: false, napMatch: false }
    },
    onPageAnalysis: {
      titleTag: 'Mock Title | Mock City',
      hasSchema: true,
      isMobileFriendly: true
    },
    speedInsights: {
      performance: 85,
      accessibility: 95,
      mobileFriendly: true
    }
  };
}
// ----------------------------------------------------

// --- UPDATED: getAllAnalyses (No functional changes) ---
// This function is ALREADY correct, just confirming it's good.
export async function getAllAnalyses(): Promise<AnalysisDoc[]> {
  console.log('Fetching all analyses from Firestore...');
  try {
    const userId = await getUserId();
    const collectionPath = `artifacts/${appId}/users/${userId}/analyses`;
    
    const q = query(collection(db, collectionPath));
    const querySnapshot = await getDocs(q);
    
    let analyses: AnalysisDoc[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      analyses.push({
        id: doc.id,
        userId: data.userId,
        businessName: data.businessName,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        report: data.report
      });
    });

    analyses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    console.log(`Found ${analyses.length} analyses.`);
    return analyses;

  } catch (error) {
    console.error("Error in getAllAnalyses:", error);
    return []; 
  }
}

// --- UPDATED: getAnalysisById (No functional changes) ---
// This function is ALREADY correct, just confirming it's good.
export async function getAnalysisById(id: string): Promise<AnalysisDoc | null> {
  console.log(`Fetching analysis by ID: ${id}`);
  try {
    const userId = await getUserId();
    const docPath = `artifacts/${appId}/users/${userId}/analyses/${id}`;
    const docRef = doc(db, docPath);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const analysis: AnalysisDoc = {
        id: docSnap.id,
        userId: data.userId,
        businessName: data.businessName,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        report: data.report
      };
      return analysis;
    } else {
      console.warn("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Error in getAnalysisById:", error);
    return null; 
  }
}

