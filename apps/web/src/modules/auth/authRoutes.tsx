import { Navigate, Route } from "react-router-dom";
import { AuthLayout, JourneyLayout } from "./layout";
import { SignIn } from "./screens/SignIn";
import { SignUp } from "./screens/SignUp";
import { Profile } from "./screens/Profile";
import { VerifyAsk, VerifyCode } from "./screens/Verify";
import { GuestOnly } from "./navigation";

/**
 * Everything auth contains.
 *
 * The composition root decides whether and where auth is mounted; which screens
 * exist and what they are called is the feature's. That is what keeps a new
 * screen from widening the module's public surface and editing `app/`.
 */
export const authRoute = (
  <Route path="auth" element={<AuthLayout />}>
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
      <Route path="verify">
        <Route index element={<VerifyAsk />} />
        <Route path="code" element={<VerifyCode />} />
      </Route>
    </Route>
  </Route>
);
