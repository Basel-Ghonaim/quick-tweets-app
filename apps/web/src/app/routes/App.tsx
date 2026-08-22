import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useSessionRestore, AuthPage } from "@modules/auth";
import { AuthDesignProvider } from "@modules/auth/_design";

export const App = () => {
  // Non-blocking, hint-gated identity restore — never gates render (Problem 3).
  useSessionRestore();

  return (
    <BrowserRouter>
      <Routes>
        {/*
         * TEMPORARY — the design-comparison phase's only integration point.
         * The provider is a layout element rather than a wrapper around each
         * page so that it mounts once for all of auth: the paths below are
         * untouched, and a single instance means switching designs re-renders
         * without remounting. Removed with `_design/` once the auth UX is
         * approved (#544).
         */}
        <Route
          path="/auth"
          element={
            <AuthDesignProvider>
              <Outlet />
            </AuthDesignProvider>
          }
        >
          <Route index element={<Navigate to="signin" replace />} />
          <Route path="signin" element={<AuthPage />} />
          <Route path="signup" element={<AuthPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
