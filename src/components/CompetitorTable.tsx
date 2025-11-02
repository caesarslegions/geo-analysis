import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, TrendingUp, AlertCircle, Trophy } from 'lucide-react';
import { GeoReport } from '@/services/analysisService';

interface CompetitorTableProps {
  analysis: GeoReport;
}

interface Competitor {
  name: string;
  rating?: number;
  reviewCount?: number;
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
  const competitors: Competitor[] = gbp.competitors || [];

  // Handle both old format (array of strings) and new format (array of objects)
  const normalizedCompetitors: Competitor[] = competitors.map((comp: any) => {
    if (typeof comp === 'string') {
      return { name: comp };
    }
    return comp;
  });

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
            <TrendingUp className="text-white" size={24} />
          </div>
          <div>
            <CardTitle className="text-2xl">Competitive Analysis</CardTitle>
            <CardDescription className="text-base">
              Your business vs. top local competitors
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Rank</TableHead>
                <TableHead className="font-bold">Business</TableHead>
                <TableHead className="font-bold">Rating</TableHead>
                <TableHead className="font-bold">Reviews</TableHead>
                <TableHead className="font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Client Row */}
              <TableRow className="bg-blue-50 font-semibold">
                <TableCell>
                  <Badge variant="secondary" className="text-xs">You</Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-bold">{businessName}</p>
                    <Badge variant="secondary" className="mt-1">Your Business</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="text-yellow-500 fill-yellow-500" size={16} />
                    <span className="font-semibold">{rating}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">{reviewCount}</span>
                </TableCell>
                <TableCell>
                  <Badge className="bg-blue-600">Analyzing</Badge>
                </TableCell>
              </TableRow>

              {/* Competitor Rows */}
              {normalizedCompetitors.length > 0 ? (
                normalizedCompetitors.map((competitor, index) => {
                  const compRating = competitor.rating || 'N/A';
                  const compReviews = competitor.reviewCount || 'N/A';
                  const hasFullData = competitor.rating !== undefined;

                  // Compare with your business
                  let statusBadge = null;
                  if (hasFullData && typeof rating === 'number' && typeof compRating === 'number') {
                    if (compRating > rating) {
                      statusBadge = <Badge className="bg-red-500">⚠️ Higher Rated</Badge>;
                    } else if (compRating < rating) {
                      statusBadge = <Badge className="bg-green-500">✓ You Win</Badge>;
                    } else {
                      statusBadge = <Badge className="bg-gray-500">= Tied</Badge>;
                    }
                  }

                  return (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {index === 0 && <Trophy className="text-yellow-500" size={18} />}
                          {index === 1 && <Trophy className="text-gray-400" size={18} />}
                          {index === 2 && <Trophy className="text-orange-600" size={18} />}
                          <Badge variant="outline" className="font-bold">#{index + 1}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {competitor.name}
                      </TableCell>
                      <TableCell>
                        {hasFullData ? (
                          <div className="flex items-center gap-1">
                            <Star className="text-yellow-500 fill-yellow-500" size={16} />
                            <span>{compRating}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not available</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasFullData ? (
                          <span className={
                            typeof compReviews === 'number' && typeof reviewCount === 'number' && compReviews > reviewCount
                              ? 'text-red-600 font-semibold'
                              : ''
                          }>
                            {compReviews}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not available</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {statusBadge || <Badge variant="outline">Tracking</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    No competitor data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Insights Section */}
        {normalizedCompetitors.length > 0 && normalizedCompetitors.some(c => c.rating !== undefined) && (
          <div className="mt-8 space-y-4">
            <h3 className="text-xl font-semibold">Competitive Insights</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Average Competitor Rating */}
              <Card className="border">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 mb-1">Avg Competitor Rating</p>
                  <p className="text-2xl font-bold">
                    {(() => {
                      const validRatings = normalizedCompetitors
                        .filter(c => c.rating !== undefined)
                        .map(c => c.rating as number);
                      if (validRatings.length === 0) return 'N/A';
                      const avg = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
                      return avg.toFixed(1);
                    })()}
                  </p>
                </CardContent>
              </Card>

              {/* Average Competitor Reviews */}
              <Card className="border">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 mb-1">Avg Competitor Reviews</p>
                  <p className="text-2xl font-bold">
                    {(() => {
                      const validReviews = normalizedCompetitors
                        .filter(c => c.reviewCount !== undefined)
                        .map(c => c.reviewCount as number);
                      if (validReviews.length === 0) return 'N/A';
                      const avg = validReviews.reduce((a, b) => a + b, 0) / validReviews.length;
                      return Math.round(avg);
                    })()}
                  </p>
                </CardContent>
              </Card>

              {/* Your Position */}
              <Card className="border">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 mb-1">Your Competitive Position</p>
                  <p className="text-lg font-bold">
                    {(() => {
                      if (typeof rating !== 'number') return 'N/A';
                      const validRatings = normalizedCompetitors
                        .filter(c => c.rating !== undefined)
                        .map(c => c.rating as number);
                      if (validRatings.length === 0) return 'N/A';
                      const avg = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
                      if (rating > avg) return '✓ Above Average';
                      if (rating < avg) return '⚠️ Below Average';
                      return '= Average';
                    })()}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompetitorTable;