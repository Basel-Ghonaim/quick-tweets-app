import { useAppSelector } from "@app/store";

export const useAuthState = () => {
  const user = useAppSelector((state) => state.auth.user);
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  return {
    user,
    accessToken,
    isLoggedIn: !!accessToken && !!user,
  };
};
