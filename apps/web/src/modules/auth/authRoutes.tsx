import { Navigate, Route } from "react-router-dom";
import { AuthDesignProvider } from "./_design";
import { AuthShell } from "./AuthShell";
import { SignIn } from "./screens/SignIn";
import { SignUp } from "./screens/SignUp";
import { Profile } from "./screens/Profile";
import { Verify } from "./screens/Verify";
import { JourneyLayout } from "./layout/JourneyLayout";
import { GuestOnly } from "./navigation";

/**
 * Everything auth contains.
 *
 * The composition root decides whether and where auth is mounted; which screens
 * exist and what they are called is the feature's. That is what keeps a new
 * screen from widening the module's public surface and editing `app/`.
 */
export const authRoute = (
  <Route
    path="auth"
    element={
      /*
       * TEMPORARY — the design-comparison phase's only integration point. One
       * instance for all of auth, so switching designs re-renders without
       * remounting. It leaves with `_design/`.
       */
      <AuthDesignProvider>
        <AuthShell />
      </AuthDesignProvider>
    }
  >
    <Route index element={<Navigate to="signin" replace />} />
    <Route path="signin" element={<SignIn />} />
    <Route element={<JourneyLayout />}>
      <Route
        path="signup"
        element={
          <GuestOnly>
            <SignUp />
          </GuestOnly>
        }
      />
      <Route path="profile" element={<Profile />} />
      <Route path="verify" element={<Verify />} />
    </Route>
  </Route>
);
