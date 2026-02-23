import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { storage } from "@/lib/platform";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/app";

  // If already authenticated, skip to app
  useEffect(() => {
    (async () => {
      const auth = await storage.get<{ token: string }>("auth");
      if (auth?.token) navigate(redirect, { replace: true });
    })();
  }, [navigate, redirect]);

  const handleLogin = () => {
    navigate(redirect, { replace: true });
  };

  return <LoginScreen onLogin={handleLogin} />;
}
