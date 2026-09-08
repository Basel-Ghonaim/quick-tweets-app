import { Navigate, Route } from "react-router-dom";
import { AuthLayout, JourneyLayout } from "./layout";
import { SignIn } from "./session/screens/SignIn";
import { SignUp } from "./session/screens/SignUp";
import { Onboarding } from "./screens/Onboarding";
import { Recovery } from "./screens/Recovery";
import { GuestOnly } from "./GuestOnly";
import { stepStates } from "./journey";

/** Everything auth contains: the composition root decides whether it is
 *  mounted, and a new screen never widens this surface. The journey is one
 *  route, because a step's URL is a second copy of a server-owned position. */
export const authRoute = (
  <Route path="auth" element={<AuthLayout />}>
    <Route index element={<Navigate to="signin" replace />} />
    <Route
      path="signin"
      element={
        <GuestOnly signedInTo="/feed">
          <SignIn />
        </GuestOnly>
      }
    />
    <Route
      path="signup"
      element={
        <GuestOnly signedInTo="/feed">
          <JourneyLayout states={stepStates("account", null)}>
            <SignUp />
          </JourneyLayout>
        </GuestOnly>
      }
    />
    <Route path="onboarding" element={<Onboarding />} />
    {/* One route for all three steps, for the reason above. A reader who is
        signed in has a better path to the same end, so they are sent to it. */}
    <Route
      path="recovery"
      element={
        <GuestOnly signedInTo="/settings/security">
          <Recovery />
        </GuestOnly>
      }
    />
  </Route>
);
