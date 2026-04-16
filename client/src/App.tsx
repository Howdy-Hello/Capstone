import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, GlobalStyles, Box } from '@mui/material';

import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Header from './components/Header';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <>
      <CssBaseline />
      <GlobalStyles
        styles={{
          html: { height: '100%', overflowX: 'hidden' }, // allow vertical scroll
          body: { minHeight: '100%', overflowX: 'hidden', margin: 0, padding: 0 },
          '#root': { minHeight: '100%', display: 'flex', flexDirection: 'column' },
        }}
      />
      <BrowserRouter>
        <Header />
        <Box component="main" sx={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Box>
        <Footer /> {/* Will only show at the end after content */}
      </BrowserRouter>
    </>
  );
};

export default App;
