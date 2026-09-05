import { Navigate, Route } from "react-router-dom";
import { AuthLayout, JourneyLayout } from "./layout";
import { SignIn } from "./screens/SignIn";
import { SignUp } from "./screens/SignUp";
import { Onboarding } from "./screens/Onboarding";
import { GuestOnly } from "./navigation";
import { stepStates } from "./journey";

/**
 * Everything auth contains.
 *
 * The composition root decides whether and where auth is mounted; which screens
 * exist and what they are called is the feature's. That is what keeps a new
 * screen from widening the module's public surface and editing `app/`.
 *
 * The journey is one route, not one per step: a step's URL would be a second
 * copy of a position the server owns, and every rule needed to reconcile them
 * exists only to defeat what a URL grants.
 */
export const authRoute = (
  <Route path="auth" element={<AuthLayout />}>
    <Route index element={<Navigate to="signin" replace />} />
    <Route path="signin" element={<SignIn />} />
    <Route
      path="signup"
      element={
        <GuestOnly>
          <JourneyLayout states={stepStates("account", null)}>
            <SignUp />
          </JourneyLayout>
        </GuestOnly>
      }
    />
    <Route path="onboarding" element={<Onboarding />} />
  </Route>
);
