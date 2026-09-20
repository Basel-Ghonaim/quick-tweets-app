import type { Catalogue } from "../../shape";
import { BRAND, JOURNEY, SAMPLE_POSTS, BACKDROP_POSTS } from "./shell";
import { SIGN_IN, SIGN_UP, REFUSALS } from "./authentication";
import { ONBOARDING } from "./onboarding";
import { PROFILE } from "./profile";
import { VERIFY } from "./verify";

export const AUTH = {
  brand: BRAND,
  journey: JOURNEY,
  signIn: SIGN_IN,
  signUp: SIGN_UP,
  errors: REFUSALS,
  onboarding: ONBOARDING,
  profile: PROFILE,
  verify: VERIFY,
  samplePosts: SAMPLE_POSTS,
  backdropPosts: BACKDROP_POSTS,
} satisfies Catalogue["auth"];
