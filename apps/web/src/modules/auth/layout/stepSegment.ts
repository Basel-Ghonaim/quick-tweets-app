/** The step owns the segment after `auth`, not the last one: a step with a
 *  nested route of its own would otherwise name none of them. */
export const stepSegment = (pathname: string): string =>
  pathname.split("/").filter(Boolean)[1] ?? "";
