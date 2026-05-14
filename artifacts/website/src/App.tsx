// App.tsx — Root of the React app.
// Sets up global providers, the page layout shell (Navbar + Footer),
// and client-side routing so the browser can navigate between pages
// without a full page reload.

import { Switch, Route, Router as WouterRouter } from "wouter";
// wouter — lightweight client-side router (replaces React Router).
// Switch renders only the first matching Route.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// React Query — handles data fetching and caching.
// Not used heavily right now but wired up for future API calls.

import { Toaster } from "@/components/ui/toaster";
// Toaster — renders toast/notification pop-ups anywhere in the app.

import { TooltipProvider } from "@/components/ui/tooltip";
// TooltipProvider — required wrapper for any Tooltip components.

import NotFound from "@/pages/not-found";       // 404 fallback page
import LandingPage from "@/pages/LandingPage";  // Main marketing page (route: /)
import PrivacyPage from "@/pages/PrivacyPage";  // Privacy policy page (route: /privacy)
import { Navbar } from "@/components/Navbar";   // Fixed top navigation bar
import { Footer } from "@/components/Footer";   // Bottom footer with links

// Create a single shared QueryClient instance for the whole app.
const queryClient = new QueryClient();

// Router — maps URL paths to page components.
// Add new pages here by adding a <Route path="..." component={...} /> entry.
function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// App — top-level component rendered by main.tsx.
// WouterRouter base is set from the BASE_PATH env var so the router
// works correctly whether the site is hosted at / or a sub-path.
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* WouterRouter: strips BASE_PATH prefix from URLs before matching routes */}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Router />
            </main>
            <Footer />
          </div>
        </WouterRouter>
        {/* Toaster sits outside the router so toasts show on every page */}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
