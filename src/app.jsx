import { Header } from "./components/Header";
import { AboutSection } from "./components/AboutSection";
import { PrizesSection } from "./components/PrizesSection";
import { Footer } from "./components/Footer";
import { SuccessPage } from "./components/SuccessPage";
import { PendingPage } from "./components/PendingPage";
import { ErrorPage } from "./components/ErrorPage";
import { PanelPage } from "./components/PanelPage";
import { LoginPage } from "./components/LoginPage";
import { TicketSectionWrapper } from "./components/TicketSectionWrapper";


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

  if (path === '/panel' || path === '/panel.html') {
    return <PanelPage />;
  }

  if (path === "/login" || path === "/login.html") {
    return <LoginPage />;
  }

  return (
    <>
      <Header />
      <AboutSection />
      <TicketSectionWrapper />
      <PrizesSection />
      <Footer />
    </>
  );
}