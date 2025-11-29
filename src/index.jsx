import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { TicketSection } from './components/TicketSection';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AboutSection } from './components/AboutSection';

function App() {
	
	useEffect(() => {

  }, []);

  return (
    <>
      <Header/>
      <AboutSection/>
      <TicketSection/>
      <Footer/>
    </>
  );
}


render(<App />, document.getElementById('app'));