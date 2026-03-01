import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { AppPage } from "@/pages/AppPage";
import { LandingPage } from "@/pages/LandingPage";
import { PricingPage } from "@/pages/PricingPage";
import { FeaturesPage } from "@/pages/FeaturesPage";
import { UseCasesPage } from "@/pages/UseCasesPage";
import { DevelopersPage } from "@/pages/DevelopersPage";
import { AboutPage } from "@/pages/AboutPage";
import { InvitePage } from "@/pages/InvitePage";
import { ProjectInvitePage } from "@/pages/ProjectInvitePage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ScrollToTop } from "@/components/marketing/ScrollToTop";
import "./App.css";

export default function WebRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/use-cases" element={<UseCasesPage />} />
        <Route path="/developers" element={<DevelopersPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/join/project/:token" element={<ProjectInvitePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
