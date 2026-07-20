import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useSessionRestore, AuthPage } from "@modules/auth";

export const App = () => {
  // Non-blocking, hint-gated identity restore — never gates render (Problem 3).
  useSessionRestore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth">
          <Route index element={<Navigate to="signin" replace />} />
          <Route path="signin" element={<AuthPage />} />
          <Route path="signup" element={<AuthPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
