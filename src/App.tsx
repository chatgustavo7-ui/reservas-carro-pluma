import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import FinalizarViagem from "./pages/FinalizarViagem";
import Admin from "./pages/Admin";
import Status from "./pages/Status";
import Reservations from "./pages/Reservations";
import CarStatus from "./pages/CarStatus";
import Vehicles from "./pages/Vehicles";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/finalizar-viagem" element={<FinalizarViagem />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/status" element={<Status />} />
          <Route path="/car-status" element={<CarStatus />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/reservas" element={<Reservations />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
