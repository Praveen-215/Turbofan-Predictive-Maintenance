import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Route-based lazy-loaded page components
const FleetOverviewPage = lazy(() =>
  import('./pages/FleetOverviewPage').then((m) => ({ default: m.FleetOverviewPage }))
);
const EngineMonitoringPage = lazy(() =>
  import('./pages/EngineMonitoringPage').then((m) => ({ default: m.EngineMonitoringPage }))
);
const EngineDetailPage = lazy(() =>
  import('./pages/EngineDetailPage').then((m) => ({ default: m.EngineDetailPage }))
);
const PredictionsPage = lazy(() =>
  import('./pages/PredictionsPage').then((m) => ({ default: m.PredictionsPage }))
);
const ModelAnalyticsPage = lazy(() =>
  import('./pages/ModelAnalyticsPage').then((m) => ({ default: m.ModelAnalyticsPage }))
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);

const PageFallback: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8">
    <LoadingSpinner label="Loading application module..." size="lg" />
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={
              <Suspense fallback={<PageFallback />}>
                <FleetOverviewPage />
              </Suspense>
            }
          />
          <Route
            path="engines"
            element={
              <Suspense fallback={<PageFallback />}>
                <EngineMonitoringPage />
              </Suspense>
            }
          />
          <Route
            path="engines/:engineId"
            element={
              <Suspense fallback={<PageFallback />}>
                <EngineDetailPage />
              </Suspense>
            }
          />
          <Route
            path="predictions"
            element={
              <Suspense fallback={<PageFallback />}>
                <PredictionsPage />
              </Suspense>
            }
          />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<PageFallback />}>
                <ModelAnalyticsPage />
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<PageFallback />}>
                <ReportsPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
