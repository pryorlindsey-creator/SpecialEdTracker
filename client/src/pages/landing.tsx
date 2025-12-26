import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, BarChart3, Users, Target } from "lucide-react";

export default function Landing() {



  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <GraduationCap className="h-10 w-10 text-blue-900 mr-4" />
              <h1 className="text-2xl font-bold text-blue-900">Special Education Data Collection App</h1>
            </div>
            <div className="flex space-x-4">
              <Button 
                onClick={() => window.location.href = '/login'} 
                size="lg"
                className="bg-blue-900 hover:bg-blue-800 text-white px-8 py-3"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-20">
          <h2 className="text-5xl font-bold text-blue-900 mb-6">
            Streamline Your IEP Goal Tracking
          </h2>
          <p className="text-xl text-blue-800 max-w-4xl mx-auto mb-10">
            A comprehensive data collection platform designed specifically for special education teachers 
            to track student progress, manage IEP goals, and generate meaningful reports with ease and precision.
          </p>
          <Button 
            onClick={() => window.location.href = '/login'} 
            size="lg"
            className="bg-blue-900 hover:bg-blue-800 text-white px-12 py-4 text-lg font-semibold"
          >
            Start Tracking Progress Today
          </Button>
        </div>

        {/* Features Grid */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl font-bold text-blue-900 text-center mb-12">Powerful Features for Special Education</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="hover:shadow-lg transition-shadow bg-white border-gray-200">
                <CardContent className="pt-8 pb-6">
                  <div className="text-center mb-6">
                    <div className="p-4 bg-blue-100 rounded-full inline-flex">
                      <Users className="h-8 w-8 text-blue-900" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-blue-900 mb-4 text-center">Student Management</h3>
                  <p className="text-blue-800 text-center">
                    Easily create and manage student profiles with individual goal tracking and comprehensive progress monitoring.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow bg-white border-gray-200">
                <CardContent className="pt-8 pb-6">
                  <div className="text-center mb-6">
                    <div className="p-4 bg-blue-100 rounded-full inline-flex">
                      <Target className="h-8 w-8 text-blue-900" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-blue-900 mb-4 text-center">Goal-Specific Tracking</h3>
                  <p className="text-blue-800 text-center">
                    Track each IEP goal individually with detailed progress bars, performance analytics, and trend analysis.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow bg-white border-gray-200">
                <CardContent className="pt-8 pb-6">
                  <div className="text-center mb-6">
                    <div className="p-4 bg-blue-100 rounded-full inline-flex">
                      <BarChart3 className="h-8 w-8 text-blue-900" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-blue-900 mb-4 text-center">Data Visualization</h3>
                  <p className="text-blue-800 text-center">
                    Generate comprehensive reports and interactive charts for IEP meetings and progress reviews.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-lg p-12">
              <h3 className="text-3xl font-bold text-blue-900 mb-8 text-center">Comprehensive IEP Data Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 text-lg mb-2">Individual Goal Progress Tracking</h4>
                      <p className="text-blue-800">Separate progress monitoring for each IEP goal with detailed analytics and no data aggregation</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 text-lg mb-2">Flexible Data Entry</h4>
                      <p className="text-blue-800">Support for percentage, fraction, frequency, and duration-based data collection methods</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 text-lg mb-2">Interactive Dashboard</h4>
                      <p className="text-blue-800">Comprehensive overview with goal counts, data points, and real-time progress updates</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 text-lg mb-2">Detailed Progress Reports</h4>
                      <p className="text-blue-800">Individual charts and scatterplots for each goal with trend analysis and performance insights</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 text-lg mb-2">Support Level Documentation</h4>
                      <p className="text-blue-800">Track and document the level of support provided during each data collection session</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center mr-4 mt-1">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 text-lg mb-2">Detailed Observations</h4>
                      <p className="text-blue-800">Capture comprehensive anecdotal notes and observations for each data point</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-blue-900 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl font-bold text-white mb-6">Ready to Transform Your IEP Data Management?</h3>
            <p className="text-blue-100 mb-10 max-w-3xl mx-auto text-xl">
              Join special education teachers who are already using our platform to streamline their IEP goal tracking, improve data accuracy, and save valuable time.
            </p>
            <Button 
              onClick={() => window.location.href = '/login'} 
              size="lg"
              className="bg-white hover:bg-gray-100 text-blue-900 px-12 py-4 text-lg font-semibold"
            >
              Start Your Free Trial Today
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white py-8 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-blue-800 mb-4">
              © 2025 Special Education Data Collection App. Designed for special education professionals.
            </p>
            <a 
              href="/admin" 
              className="text-sm text-gray-500 hover:text-blue-800 transition-colors"
            >
              website administrator Sandra Lindsey
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
