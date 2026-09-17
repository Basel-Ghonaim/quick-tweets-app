/** Where a route points while the surface it names is not built. */
export const PLACEHOLDER_COPY = {
  /* A whole title per surface: a name slotted into a sentence cannot keep its agreement. */
  notBuiltTitle: {
    feed: "Feed is not built yet",
    tweet: "Tweet details is not built yet",
    profile: "Profile is not built yet",
    settings: "Settings is not built yet",
    security: "Security is not built yet",
  },
  notBuiltBody: "It is part of the product and it is coming. This page is standing in until it does.",

  unknownTitle: "There is nothing at this address",
  unknownBody: "The link may be mistyped, or it may point at something that was never here.",
} as const;
