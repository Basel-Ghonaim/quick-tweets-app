import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthPage } from "../../modules/auth";
import { useInitAuth } from "../../modules/auth/hooks";

export const App = () => {
  const { isInitializing } = useInitAuth();

  if (isInitializing) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth">
          <Route index element={<Navigate to="signin" replace />} />
          <Route path="signin" element={<AuthPage />} />
          <Route path="signup" element={<AuthPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
