import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "@/lib/platform";
import App from "@/App";

export function AppPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const auth = await storage.get<{ token: string }>("auth");
      if (!auth?.token) {
        navigate("/login", { replace: true });
        return;
      }
      setChecked(true);
    })();
  }, [navigate]);

  const handleRequireLogin = () => {
    navigate("/login", { replace: true });
  };

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  return <App onRequireLogin={handleRequireLogin} />;
}
