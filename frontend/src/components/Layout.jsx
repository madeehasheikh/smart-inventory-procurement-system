import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
  const location = useLocation();

  // Get active page name based on route path
  const getPageTitle = (pathname) => {
    const path = pathname.split('/')[1] || 'dashboard';
    if (path === 'ai-insights') return 'AI Forecasting & Insights';
    if (path === 'audit-logs') return 'System Audit Trail';
    return path.replace('-', ' ');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <Header title={getPageTitle(location.pathname)} />
      
      {/* Main Contents Panel */}
      <main className="pt-16 md:pl-64 min-h-screen">
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Layout;
