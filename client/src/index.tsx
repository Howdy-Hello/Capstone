import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/600.css';
import '@fontsource/roboto/700.css';
import '@fontsource/roboto/800.css';
import '@fontsource/roboto/900.css';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/500.css';
import '@fontsource/roboto-mono/600.css';
import '@fontsource/roboto-mono/700.css';
import App from './App';
// import { UserProvider } from './context/UserContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const render = () => root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);

// The first paint waits briefly for the fonts, so text doesn't jump when they
// swap in. A slow connection falls back to system fonts rather than a blank page.
const FIRST_PAINT_FONTS = [
  "400 16px Roboto", "500 16px Roboto", "700 16px Roboto", "800 16px Roboto", "900 32px Roboto",
  "400 14px 'Roboto Mono'", "700 14px 'Roboto Mono'",
];
Promise.race([
  Promise.all(FIRST_PAINT_FONTS.map((font) => document.fonts.load(font))),
  new Promise((resolve) => setTimeout(resolve, 600)),
]).then(render, render);
