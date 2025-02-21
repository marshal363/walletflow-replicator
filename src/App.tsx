import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Lightning from "./pages/Lightning";
import Send from "./pages/Send";
import Amount from "./pages/Amount";
import Message from "./pages/Message";
import Messages from "./pages/Messages";
import PaymentFailed from "./pages/PaymentFailed";
import Wallet from "./pages/Wallet";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";
import AuthProvider from "./components/AuthProvider";
import AddWallet from "./pages/AddWallet";
import MultisigSetup from "./pages/MultisigSetup";
import SyncUserWithConvex from "./components/SyncUSerWithCOnvex";
import RequestAmount from "./pages/RequestAmount";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SyncUserWithConvex />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/sign-in/*" element={<SignInPage />} />
              <Route path="/sign-up/*" element={<SignUpPage />} />
              
              {/* App routes */}
              <Route path="/lightning" element={<Lightning />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/add-wallet" element={<AddWallet />} />
              <Route path="/add-wallet/multisig-setup" element={<MultisigSetup />} />
              <Route path="/send" element={<Send />} />
              <Route path="/send/:id" element={<Amount />} />
              <Route path="/request/:id" element={<RequestAmount />} />
              <Route path="/split/:id" element={<Send />} />
              <Route path="/amount/:id" element={<Amount />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:id" element={<Message />} />
              <Route path="/payment-failed" element={<PaymentFailed />} />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;