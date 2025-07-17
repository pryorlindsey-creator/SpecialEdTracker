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
  // Authentication disabled for development - direct access to all pages
  console.log('[ROUTER] Router component loaded');
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/students/:id" component={(params) => {
        console.log(`[ROUTER] Navigating to student detail with params:`, params);
        return <StudentDetail />;
      }} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/landing" component={Landing} />
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
