import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Star, TrendingUp, ExternalLink, Trophy } from 'lucide-react';
import { Analysis } from '@/services/analysisService';

interface CompetitorTableProps {
  analysis: Analysis;
}

const CompetitorTable = ({ analysis }: CompetitorTableProps) => {
  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
            <TrendingUp className="text-white" size={24} />
          </div>
          <div>
            <CardTitle className="text-2xl">Top 3 Competitor Analysis</CardTitle>
            <CardDescription className="text-base">
              Detailed analysis of the top 3 ranking competitors in {analysis.location}
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
                <TableHead className="font-bold">Website</TableHead>
                <TableHead className="font-bold">Rating</TableHead>
                <TableHead className="font-bold">Reviews</TableHead>
                <TableHead className="font-bold">Recency</TableHead>
                <TableHead className="font-bold">Location Pages</TableHead>
                <TableHead className="font-bold">Service Areas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Client Row */}
              <TableRow className="bg-blue-50 font-semibold">
                <TableCell>
                  <Badge variant="secondary" className="text-xs">Not Ranked</Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-bold">{analysis.businessName}</p>
                    <Badge variant="secondary" className="mt-1">Your Business</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-gray-500 text-sm">-</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="text-yellow-500 fill-yellow-500" size={16} />
                    <span>{analysis.clientData.rating}</span>
                  </div>
                </TableCell>
                <TableCell>{analysis.clientData.reviewCount}</TableCell>
                <TableCell>{analysis.clientData.reviewRecency}</TableCell>
                <TableCell>
                  {analysis.clientData.hasLocationPages ? (
                    <CheckCircle2 className="text-green-500" size={20} />
                  ) : (
                    <XCircle className="text-red-500" size={20} />
                  )}
                </TableCell>
                <TableCell>{analysis.clientData.serviceAreas.length} areas</TableCell>
              </TableRow>

              {/* Competitor Rows */}
              {analysis.competitors.map((competitor, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {competitor.rankPosition === 1 && <Trophy className="text-yellow-500" size={18} />}
                      {competitor.rankPosition === 2 && <Trophy className="text-gray-400" size={18} />}
                      {competitor.rankPosition === 3 && <Trophy className="text-orange-600" size={18} />}
                      <Badge variant="outline" className="font-bold">#{competitor.rankPosition}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{competitor.name}</TableCell>
                  <TableCell>
                    <a 
                      href={competitor.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-sm"
                    >
                      <span className="max-w-[150px] truncate">{competitor.url.replace('https://www.', '').replace('.com', '')}</span>
                      <ExternalLink size={14} />
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="text-yellow-500 fill-yellow-500" size={16} />
                      <span>{competitor.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={competitor.reviewCount > analysis.clientData.reviewCount ? 'text-red-600 font-semibold' : ''}>
                      {competitor.reviewCount}
                    </span>
                  </TableCell>
                  <TableCell>{competitor.reviewRecency}</TableCell>
                  <TableCell>
                    {competitor.hasLocationPages ? (
                      <CheckCircle2 className="text-green-500" size={20} />
                    ) : (
                      <XCircle className="text-red-500" size={20} />
                    )}
                  </TableCell>
                  <TableCell>{competitor.serviceAreas.length} areas</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Detailed Competitor Analysis */}
        <div className="mt-8 space-y-6">
          <h3 className="text-xl font-semibold">Detailed Insights - Top 3 Competitors</h3>
          {analysis.competitors.map((competitor, index) => (
            <Card key={index} className="border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {competitor.rankPosition === 1 && <Trophy className="text-yellow-500" size={20} />}
                      {competitor.rankPosition === 2 && <Trophy className="text-gray-400" size={20} />}
                      {competitor.rankPosition === 3 && <Trophy className="text-orange-600" size={20} />}
                      <Badge variant="outline">Rank #{competitor.rankPosition}</Badge>
                    </div>
                    <CardTitle className="text-lg">{competitor.name}</CardTitle>
                    <a 
                      href={competitor.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-sm mt-1"
                    >
                      {competitor.url}
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="text-yellow-500 fill-yellow-500" size={16} />
                      <span className="font-semibold">{competitor.rating}</span>
                    </div>
                    <p className="text-sm text-gray-600">{competitor.reviewCount} reviews</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    Competitive Advantages
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {competitor.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <XCircle size={18} />
                    Weaknesses & Opportunities
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {competitor.weaknesses.map((weakness, i) => (
                      <li key={i}>{weakness}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2">Key Services Offered</h4>
                  <div className="flex flex-wrap gap-2">
                    {competitor.keyServices.map((service, i) => (
                      <Badge key={i} variant="outline">{service}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-700 mb-2">Service Coverage</h4>
                  <div className="flex flex-wrap gap-2">
                    {competitor.serviceAreas.map((area, i) => (
                      <Badge key={i} variant="secondary" className="bg-purple-100 text-purple-800">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CompetitorTable;