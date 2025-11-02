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

// Main report data structure
export interface GeoReport {
  gbpAnalysis: Record<string, any>;
  citationAnalysis: Record<string, any>;
  onPageAnalysis: Record<string, any>;
  speedInsights: Record<string, any>;
}

// Type for saved analysis documents
export interface AnalysisDoc {
  id: string;
  userId: string;
  businessName: string;
  websiteUrl: string; // Added this
  createdAt: Date;
  report: GeoReport;
}

// --- NEW: Helper function to call our multi-task API ---
/**
 * Calls our /api/get-analysis function for a *single* task.
 */
async function getSingleAnalysis(
  type: 'gbp' | 'citations' | 'onPage' | 'speed',
  businessName: string,
  fullAddress: string,
  websiteUrl: string
): Promise<any> {
  
  const body = {
    businessName,
    fullAddress,
    websiteUrl,
    type, // We send the type to tell the serverless function what to do
  };

  try {
    const response = await fetch('/api/get-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Try to parse the error from the serverless function
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `API call failed with status ${response.status}`);
      } catch (e) {
        throw new Error(`API call failed with status ${response.status} and non-JSON response.`);
      }
    }
    
    // We expect a JSON response for the single task
    return await response.json();

  } catch (error: any) {
    console.error(`Error fetching analysis type ${type}:`, error);
    // Return a standard error object so Promise.allSettled can handle it
    return { error: error.message };
  }
}

// --- NEW: Helper function to save the report ---
async function saveAnalysis(userId: string, report: GeoReport, businessName: string, websiteUrl: string): Promise<string> {
  try {
    const collectionPath = `artifacts/${appId}/users/${userId}/analyses`;
    const analysesCollection = collection(db, collectionPath);

    const docRef = await addDoc(analysesCollection, {
      userId: userId,
      businessName: businessName,
      websiteUrl: websiteUrl, // Save the URL too
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

// --- RE-WRITTEN: This function now manages 4 parallel API calls ---
export async function generateRealReport(
  businessName: string,
  fullAddress: string,
  websiteUrl: string
): Promise<GeoReport> {
  console.log('Starting real report generation (4 parallel client-side calls)...');

  try {
    // --- Step 1: Run all 4 analyses in parallel from the client ---
    const [gbpResult, citationResult, onPageResult, speedResult] = await Promise.allSettled([
      getSingleAnalysis('gbp', businessName, fullAddress, websiteUrl),
      getSingleAnalysis('citations', businessName, fullAddress, websiteUrl),
      getSingleAnalysis('onPage', businessName, fullAddress, websiteUrl),
      getSingleAnalysis('speed', businessName, fullAddress, websiteUrl)
    ]);

    // --- Step 2: Combine results into the final report ---
    const report: GeoReport = {
      gbpAnalysis: gbpResult.status === 'fulfilled' 
        ? gbpResult.value 
        : { error: gbpResult.reason.message },
      citationAnalysis: citationResult.status === 'fulfilled' 
        ? citationResult.value 
        : { error: citationResult.reason.message },
      onPageAnalysis: onPageResult.status === 'fulfilled' 
        ? onPageResult.value 
        : { error: onPageResult.reason.message },
      speedInsights: speedResult.status === 'fulfilled' 
        ? speedResult.value 
        : { error: speedResult.reason.message }
    };

    console.log('Report generation complete:', report);

    // --- Step 3: Get User ID and Save Report ---
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

// --- Firestore Data Fetching Functions (Unchanged) ---

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
        websiteUrl: data.websiteUrl || '', // Add fallback
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
        websiteUrl: data.websiteUrl || '', // Add fallback
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

