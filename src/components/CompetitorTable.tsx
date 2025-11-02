import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, TrendingUp, AlertCircle } from 'lucide-react';
import { GeoReport } from '@/services/analysisService';

interface CompetitorTableProps {
  analysis: GeoReport;
}

const CompetitorTable = ({ analysis }: CompetitorTableProps) => {
  const gbp = analysis.gbpAnalysis;
  
  // Safety check
  if (!gbp || gbp.error) {
    return (
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="text-red-500" />
            Competitor Analysis Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">
            {gbp?.error || "Could not load competitor data."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Extract data safely
  const businessName = gbp.name || 'Your Business';
  const rating = gbp.rating || 'N/A';
  const reviewCount = gbp.reviewCount || 0;
  const competitors = gbp.competitors || [];

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
            <TrendingUp className="text-white" size={24} />
          </div>
          <div>
            <CardTitle className="text-2xl">Google Business Profile Analysis</CardTitle>
            <CardDescription className="text-base">
              Your business profile and top competitors
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Business</TableHead>
                <TableHead className="font-bold">Rating</TableHead>
                <TableHead className="font-bold">Reviews</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Client Row */}
              <TableRow className="bg-blue-50 font-semibold">
                <TableCell>
                  <div>
                    <p className="font-bold">{businessName}</p>
                    <Badge variant="secondary" className="mt-1">Your Business</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="text-yellow-500 fill-yellow-500" size={16} />
                    <span>{rating}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">{reviewCount}</span>
                </TableCell>
              </TableRow>

              {/* Competitor Rows - Currently only have names */}
              {competitors.length > 0 ? (
                competitors.map((competitorName, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span>{competitorName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-400 text-sm">Not available</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-400 text-sm">Not available</span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                    No competitor data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Information Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-blue-600 mt-0.5" size={18} />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Limited Competitor Data</p>
              <p>Your current API only returns competitor names. To get full competitor analysis (ratings, reviews, URLs, strengths/weaknesses), you'll need to enhance your backend API to fetch detailed competitor information.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompetitorTable;