import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, BarChart3, Users, Target } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-background to-muted/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Special Education Data Collection</h1>
            </div>
            <Button onClick={() => window.location.href = '/api/login'} size="lg">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Streamline Your IEP Goal Tracking
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A comprehensive data collection platform designed specifically for special education teachers 
            to track student progress, manage IEP goals, and generate meaningful reports.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 ml-4">Student Management</h3>
              </div>
              <p className="text-gray-600">
                Easily create and manage student profiles with individual goal tracking and progress monitoring.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Target className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 ml-4">Goal-Specific Tracking</h3>
              </div>
              <p className="text-gray-600">
                Track each IEP goal individually with detailed progress bars and performance analytics.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 ml-4">Data Visualization</h3>
              </div>
              <p className="text-gray-600">
                Generate comprehensive reports and charts for IEP meetings and progress reviews.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Features */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Individual Goal Progress Bars</h4>
                  <p className="text-gray-600 text-sm">Separate progress tracking for each IEP goal with no overall aggregation</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Comprehensive Data Entry</h4>
                  <p className="text-gray-600 text-sm">Flexible forms supporting percentage and fraction-based scoring</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Student Overview Dashboard</h4>
                  <p className="text-gray-600 text-sm">Quick access to goal counts, data points, and last update timestamps</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Goal-Specific Reports</h4>
                  <p className="text-gray-600 text-sm">Individual charts and analytics for each goal with trend analysis</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Support Level Tracking</h4>
                  <p className="text-gray-600 text-sm">Document the level of support needed for each data point</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Anecdotal Information</h4>
                  <p className="text-gray-600 text-sm">Capture detailed observations and notes for each data collection session</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join special education teachers who are already using our platform to streamline their IEP goal tracking and data collection.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'} 
            size="lg"
            className="px-8 py-3 text-lg"
          >
            Sign In to Begin
          </Button>
        </div>
      </main>
    </div>
  );
}
