import { ClerkProvider } from '@clerk/react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<ClerkProvider afterSignOutUrl="/">
      <App />
    </ClerkProvider>);