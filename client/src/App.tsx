import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Sightings from "./pages/Sightings";
import Statistics from "./pages/Statistics";
import Admin from "./pages/Admin";
import Encyclopedia from "./pages/Encyclopedia";
import EncyclopediaDetail from "./pages/EncyclopediaDetail";
import Review from "./pages/Review";
import AiModelManager from "./pages/AiModelManager";
import Layout from "./components/Layout";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/sightings" component={Sightings} />
        <Route path="/statistics" component={Statistics} />
        <Route path="/encyclopedia" component={Encyclopedia} />
        <Route path="/encyclopedia/:id" component={EncyclopediaDetail} />
        <Route path="/admin" component={Admin} />
        <Route path="/review" component={Review} />
        <Route path="/admin/ai-models" component={AiModelManager} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
