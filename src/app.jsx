import { Header } from "./components/Header";
import { AboutSection } from "./components/AboutSection";
import { TicketSection } from "./components/TicketSection";
import { PrizesSection } from "./components/PrizesSection";
import { Footer } from "./components/Footer";
import { SuccessPage } from "./components/SuccessPage";
import { PendingPage } from "./components/PendingPage";
import { ErrorPage } from "./components/ErrorPage";
import { PanelPage } from "./components/PanelPage";


export function App() {
  const path = window.location.pathname;

  if (path === '/success' || path === '/success.html') {
    return <SuccessPage />;
  }

  if (path === '/pending' || path === '/pending.html') {
    return <PendingPage />;
  }

  if (
    path === '/error' ||
    path === '/error.html' ||
    path === '/failure' ||
    path === '/failure.html'
  ) {
    return <ErrorPage />;
  }

  if (path === '/panel' || path === 'panel.html') {
    return <PanelPage />;
  }

  return (
    <>
      <Header />
      <AboutSection />
      <TicketSection />
      <PrizesSection />
      <Footer />
    </>
  );
}