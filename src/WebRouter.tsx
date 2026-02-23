import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { AppPage } from "@/pages/AppPage";
import { LandingPage } from "@/pages/LandingPage";
import { PricingPage } from "@/pages/PricingPage";
import { InvitePage } from "@/pages/InvitePage";
import "./App.css";

export default function WebRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
