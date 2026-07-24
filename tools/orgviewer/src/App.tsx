import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/app-layout";
import { HomePage } from "./pages/home-page";
import { ViewPage } from "./pages/view-page";
import { EntityPage } from "./pages/entity-page";

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/views/:slug" element={<ViewPage />} />
        <Route path="/entities/:entityKey" element={<EntityPage />} />
      </Routes>
    </AppLayout>
  );
}
