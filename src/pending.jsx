import './styles.css';
import { render } from 'preact';
import { PendingPage } from './components/PendingPage';

render(<PendingPage />, document.getElementById('app'));