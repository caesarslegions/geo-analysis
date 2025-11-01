import { Link } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Search, Database, Sparkles, TrendingUp, MapPin, Star, Globe, Plus } from 'lucide-react';

const Index = () => {
  const features = [
    {
      icon: Search,
      title: 'Competitor Discovery',
      description: 'Automatically identify top-ranking local competitors in your area',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Database,
      title: 'Data Extraction',
      description: 'Extract GMB ratings, reviews, and website data from competitors',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Sparkles,
      title: 'AI Analysis',
      description: 'AI-powered insights identify strengths, weaknesses, and opportunities',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: TrendingUp,
      title: 'Actionable Recommendations',
      description: 'Get prioritized action plans to improve your local SEO performance',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  const stats = [
    { label: 'Analyses Completed', value: '1,247', icon: Database },
    { label: 'Ranking Improvement', value: '+34%', icon: TrendingUp },
    { label: 'Competitors Analyzed', value: '8,932', icon: MapPin },
    { label: 'Client Satisfaction', value: '4.9/5', icon: Star }
  ];

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center sticky top-0 z-10 gap-4 border-b bg-white px-6 py-4">
        <SidebarTrigger />
        <h1 className="text-2xl font-semibold">AI-Powered GEO Competitor Analysis</h1>
      </header>
      
      <main className="flex-1 overflow-auto">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-6 py-16">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dominate Local Search Rankings
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Discover exactly what your competitors are doing right, identify your weaknesses, 
                and get AI-powered recommendations to outrank them in Google Maps and local search.
              </p>
              <Link to="/new-analysis">
                <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="mr-2" size={20} />
                  Start New Analysis
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-6 py-12 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="border-2 hover:shadow-lg transition-shadow h-full">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-3 rounded-lg">
                          <stat.icon className="text-blue-600" size={24} />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                          <p className="text-xs text-gray-600 leading-tight">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold mb-4">How It Works</h3>
              <p className="text-lg text-gray-600">Three powerful stages to transform your local SEO strategy</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-2">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                        <feature.icon className="text-white" size={24} />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-base">{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-16 bg-gradient-to-br from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center text-white">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-4xl font-bold mb-6">Ready to Outrank Your Competitors?</h3>
              <p className="text-xl mb-8 opacity-90">
                Get your comprehensive competitor analysis in minutes, not days.
              </p>
              <Link to="/new-analysis">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                  <Sparkles className="mr-2" size={20} />
                  Launch Your First Analysis
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;