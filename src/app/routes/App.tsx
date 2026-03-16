import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthPage } from "../../modules/auth";

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
};
