// ---------------------------------------------------------------
// NAP (Name, Address, Phone) NORMALIZATION & MATCHING
// ---------------------------------------------------------------

interface NAPData {
  name: string;
  address: string;
  phone?: string;
}

interface NormalizedNAP {
  name: string;
  address: string;
  phone: string;
  // Parsed components
  street: string;
  city: string;
  state: string;
  zip: string;
}

/**
 * Normalize business name for comparison
 * Handles: LLC/Inc, punctuation, articles, spacing
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|incorporated|ltd|limited|co|company)\b\.?/gi, '')
    .replace(/\b(the|a|an)\b/g, '') // Remove articles
    .replace(/[^a-z0-9]/g, '') // Remove all punctuation and spaces
    .trim();
}

/**
 * Normalize address for comparison
 * Handles: Abbreviations, suite numbers, punctuation, spacing
 */
function normalizeAddress(address: string): string {
  const abbreviations: Record<string, string> = {
    'street': 'st', 'st.': 'st',
    'avenue': 'ave', 'ave.': 'ave',
    'boulevard': 'blvd', 'blvd.': 'blvd',
    'road': 'rd', 'rd.': 'rd',
    'drive': 'dr', 'dr.': 'dr',
    'lane': 'ln', 'ln.': 'ln',
    'court': 'ct', 'ct.': 'ct',
    'circle': 'cir', 'cir.': 'cir',
    'place': 'pl', 'pl.': 'pl',
    'suite': 'ste', 'ste.': 'ste', '#': 'ste',
    'apartment': 'apt', 'apt.': 'apt',
    'building': 'bldg', 'bldg.': 'bldg',
    'floor': 'fl', 'fl.': 'fl',
    'north': 'n', 'south': 's', 'east': 'e', 'west': 'w',
  };

  let normalized = address.toLowerCase();
  
  // Replace abbreviations with standard forms
  for (const [long, short] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${long}\\b`, 'gi');
    normalized = normalized.replace(regex, short);
  }
  
  // Remove suite/unit numbers (they're less important for matching)
  normalized = normalized.replace(/\b(ste|suite|apt|apartment|unit|#)\s*[a-z0-9-]+\b/gi, '');
  
  // Remove all non-alphanumeric characters
  normalized = normalized.replace(/[^a-z0-9]/g, '');
  
  return normalized;
}

/**
 * Normalize phone number for comparison
 * Handles: Country codes, formatting, extensions
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Keep only digits
  let digits = phone.replace(/\D/g, '');
  
  // Remove country code (1) if present
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.substring(1);
  }
  
  // Remove extension (anything after 10 digits)
  if (digits.length > 10) {
    digits = digits.substring(0, 10);
  }
  
  return digits;
}

/**
 * Parse address into components
 */
function parseAddress(fullAddress: string): { street: string; city: string; state: string; zip: string } {
  const parts = fullAddress.split(',').map(s => s.trim());
  
  // Expected format: "Street, City, State ZIP"
  const street = parts[0] || '';
  const city = parts[1] || '';
  const stateZip = parts[2] || '';
  
  // Extract state and ZIP
  const stateZipMatch = stateZip.match(/([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?/);
  const state = stateZipMatch?.[1] || '';
  const zip = stateZipMatch?.[2] || '';
  
  return { street, city, state, zip };
}

/**
 * Fully normalize NAP data for comparison
 */
export function normalizeNAP(nap: NAPData): NormalizedNAP {
  const { street, city, state, zip } = parseAddress(nap.address);
  
  return {
    name: normalizeName(nap.name),
    address: normalizeAddress(nap.address),
    phone: normalizePhone(nap.phone || ''),
    street: normalizeAddress(street),
    city: city.toLowerCase().replace(/[^a-z]/g, ''),
    state: state.toUpperCase(),
    zip: zip.replace(/\D/g, ''),
  };
}

/**
 * Compare two NAP records
 * Returns scores for each component and overall match
 */
export function compareNAP(source: NAPData, target: NAPData): {
  nameMatch: boolean;
  addressMatch: boolean;
  phoneMatch: boolean;
  overallMatch: boolean;
  confidence: number; // 0-100
  details: {
    nameScore: number;
    addressScore: number;
    phoneScore: number;
  };
} {
  const normSource = normalizeNAP(source);
  const normTarget = normalizeNAP(target);
  
  // Name matching (fuzzy - allows partial matches)
  const nameMatch = normSource.name.includes(normTarget.name) || 
                    normTarget.name.includes(normSource.name) ||
                    levenshteinSimilarity(normSource.name, normTarget.name) > 0.8;
  
  // Address matching (check street AND city)
  const streetMatch = normSource.street === normTarget.street || 
                      normSource.street.includes(normTarget.street) ||
                      normTarget.street.includes(normSource.street);
  
  const cityMatch = normSource.city === normTarget.city;
  const zipMatch = normSource.zip === normTarget.zip || !normSource.zip || !normTarget.zip;
  
  const addressMatch = streetMatch && cityMatch && zipMatch;
  
  // Phone matching (exact match required)
  const phoneMatch = normSource.phone === normTarget.phone || 
                     !normSource.phone || 
                     !normTarget.phone;
  
  // Calculate confidence score
  let confidence = 0;
  if (nameMatch) confidence += 40;
  if (addressMatch) confidence += 50;
  if (phoneMatch && normSource.phone && normTarget.phone) confidence += 10;
  
  // Overall match requires name + address
  const overallMatch = nameMatch && addressMatch;
  
  return {
    nameMatch,
    addressMatch,
    phoneMatch,
    overallMatch,
    confidence,
    details: {
      nameScore: nameMatch ? 100 : levenshteinSimilarity(normSource.name, normTarget.name) * 100,
      addressScore: addressMatch ? 100 : (streetMatch ? 50 : 0) + (cityMatch ? 50 : 0),
      phoneScore: phoneMatch ? 100 : 0,
    },
  };
}

/**
 * Levenshtein distance similarity (0-1)
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// ---------------------------------------------------------------
// EXAMPLE USAGE
// ---------------------------------------------------------------

// Source (what user entered)
const userBusiness: NAPData = {
  name: "The Gents Place",
  address: "10225 Research Blvd #310, Austin, TX 78759",
  phone: "(512) 555-1234"
};

// Target (what we found in a directory)
const yelpBusiness: NAPData = {
  name: "Gents Place Barbershop",
  address: "10225 Research Boulevard Suite 310, Austin, Texas 78759",
  phone: "512-555-1234"
};

const wrongBusiness: NAPData = {
  name: "Michaels",
  address: "10225 Research Boulevard, Austin, TX 78759",
  phone: "(512) 555-9999"
};

console.log("=== Correct Business Match ===");
console.log(compareNAP(userBusiness, yelpBusiness));

console.log("\n=== Wrong Business (Michaels) ===");
console.log(compareNAP(userBusiness, wrongBusiness));

console.log("\n=== Normalized Forms ===");
console.log("User:", normalizeNAP(userBusiness));
console.log("Yelp:", normalizeNAP(yelpBusiness));
console.log("Michaels:", normalizeNAP(wrongBusiness));