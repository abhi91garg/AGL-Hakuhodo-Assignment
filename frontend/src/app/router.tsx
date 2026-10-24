import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Brief } from "@/pages/Brief";
import { CarsPage } from "@/features/cars/pages/CarsPage";

/**
 * Keep the challenge brief available while the inventory is the main route.
 */
export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<CarsPage />} />
      <Route path="/brief" element={<Brief />} />
    </Routes>
  </BrowserRouter>
);
