import { useSessionSelector } from "../store/hooks";
import { selectAccessToken, selectSessionStatus, selectSessionUser } from "../store";

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
