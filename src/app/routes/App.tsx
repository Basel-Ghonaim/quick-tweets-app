import { BrowserRouter, Route, Routes } from "react-router-dom";

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<h1>Authentication page</h1>} />
      </Routes>
    </BrowserRouter>
  );
};
