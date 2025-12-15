import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { TicketSection } from './components/TicketSection';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AboutSection } from './components/AboutSection';
import PrizesSection from './components/PrizesSection';
import { SuccessPage } from './components/SuccessPage';
import { ErrorPage } from './components/ErrorPage';
import { PendingPage } from './components/PendingPage';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };


    window.addEventListener('popstate', handleLocationChange);

    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  if (currentPath === '/success' || currentPath === '/success.html') {
    return <SuccessPage />;
  }

  if (currentPath === '/pending' || currentPath === '/pending.html') {
    return <PendingPage />;
  }

  if (currentPath === '/error' || currentPath === '/error.html' || currentPath === '/failure' || currentPath === '/failure.html') {
    return <ErrorPage />;
  }

  // Página principal
  return (
    <>
      <Header/>
      <AboutSection/>
      <PrizesSection/>
      <TicketSection/>
      <Footer/>
    </>
  );
}


render(<App />, document.getElementById('app'));