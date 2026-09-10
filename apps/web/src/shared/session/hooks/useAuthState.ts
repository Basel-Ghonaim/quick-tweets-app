import { useSessionSelector } from "./useSessionSelector";
import { selectAccessToken, selectSessionStatus, selectSessionUser } from "../state/selectors";

export const useAuthState = () => {
  const user = useSessionSelector(selectSessionUser);
  const accessToken = useSessionSelector(selectAccessToken);
  const status = useSessionSelector(selectSessionStatus);

  return {
    user,
    accessToken,
    isLoggedIn: !!accessToken && !!user,
    sessionSettled: status === "settled",
  };
};
