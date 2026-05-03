import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthPage } from "../../modules/auth";

export const App = () => {
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
