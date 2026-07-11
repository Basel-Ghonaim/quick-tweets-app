import { useAuthSelector } from "../store/hooks";

export const useAuthState = () => {
  const user = useAuthSelector((state) => state.auth.user);
  const accessToken = useAuthSelector((state) => state.auth.accessToken);

  return {
    user,
    accessToken,
    isLoggedIn: !!accessToken && !!user,
  };
};
