import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import StudentDetail from "@/pages/student-detail";
import NotFound from "@/pages/not-found";
import AdminPage from "@/pages/admin";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-blue-800">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Landing page for unauthenticated users or explicit landing route */}
      <Route path="/landing" component={Landing} />
      
      {/* Root path routing based on authentication */}
      <Route path="/">
        {isAuthenticated ? <Home /> : <Landing />}
      </Route>
      
      {/* Protected routes - require authentication */}
      <Route path="/students/:id">
        {isAuthenticated ? <StudentDetail /> : <Landing />}
      </Route>
      
      <Route path="/admin">
        {isAuthenticated ? <AdminPage /> : <Landing />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
