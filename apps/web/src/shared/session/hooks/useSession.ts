import {
  useSessionSelector,
  selectAccessToken,
  selectSessionStatus,
  selectSessionUser,
} from "../store";

export const useSession = () => {
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
