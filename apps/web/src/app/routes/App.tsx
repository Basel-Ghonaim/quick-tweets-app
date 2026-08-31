import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import {
  useSessionRestore,
  AuthPage,
  AuthDesignProvider,
} from "@modules/auth";
import { Placeholder } from "./placeholder";

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

        {/*
         * The product's committed surfaces, standing in until they are built.
         * Each line goes when its surface exists, which is the whole schedule -
         * and until then this table is where what is outstanding can be read.
         */}
        <Route path="/feed" element={<Placeholder surface="Feed" />} />
        <Route path="/tweet/:id" element={<Placeholder surface="Tweet details" />} />
        <Route path="/profile/:username" element={<Placeholder surface="Profile" />} />
        <Route path="/settings" element={<Placeholder surface="Settings" />} />

        {/*
         * Sign in is the only surface the product actually has, so the front
         * door leads there rather than to a stand-in. This line becomes the
         * feed when the feed exists.
         */}
        <Route path="/" element={<Navigate to="/auth/signin" replace />} />

        {/* Named nothing, so it says the path matched nothing. */}
        <Route path="*" element={<Placeholder />} />
      </Routes>
    </BrowserRouter>
  );
};
