// Forwarded, not owned: the helper sits in `foundations/` so that `icons/` can
// reach it too (Finding 0016). Components keep taking it from their own barrel.
export { classNames } from "../../../foundations/helpers";
export { customProperties } from "./customProperties";
