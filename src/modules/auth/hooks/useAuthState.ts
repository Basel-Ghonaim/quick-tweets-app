import { useAppSelector } from "@app/store";

export const useAuthState = () => {
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);

  return {
    user,
    token,
    isLoggedIn: !!token && !!user,
  };
};
