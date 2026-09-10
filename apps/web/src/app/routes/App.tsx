import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useSessionRestore } from "@shared/session";
import { authRoute } from "@modules/auth";
import { Placeholder } from "./placeholder";

export const App = () => {
  // Non-blocking, hint-gated identity restore — never gates render (Problem 3).
  useSessionRestore();

  return (
    <BrowserRouter>
      <Routes>
        {authRoute}

        {/*
         * The product's committed surfaces, standing in until they are built.
         * Each line goes when its surface exists, which is the whole schedule -
         * and until then this table is where what is outstanding can be read.
         */}
        <Route path="/feed" element={<Placeholder surface="Feed" />} />
        <Route path="/tweet/:id" element={<Placeholder surface="Tweet details" />} />
        <Route path="/profile/:username" element={<Placeholder surface="Profile" />} />
        <Route path="/settings" element={<Placeholder surface="Settings" />} />
        {/* Where a signed-in reader who has lost their password is sent, so
            recovery's guard has a destination before Settings is built. */}
        <Route path="/settings/security" element={<Placeholder surface="Security" />} />

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
