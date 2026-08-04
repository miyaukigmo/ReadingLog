import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Import from './pages/Import';
import DocumentDetail from './pages/DocumentDetail';
import DocumentEdit from './pages/DocumentEdit';
import Review from './pages/Review';
import ReviewSession from './pages/ReviewSession';
import Tools from './pages/Tools';
import Settings from './pages/Settings';
import Tags from './pages/Tags';
import TagDetail from './pages/TagDetail';
import GlobalTimeline from './pages/GlobalTimeline';
import GlobalPeople from './pages/GlobalPeople';
import NextSteps from './pages/NextSteps';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Dashboard />,
      },
      {
        path: '/timeline',
        element: <GlobalTimeline />,
      },
      {
        path: '/people',
        element: <GlobalPeople />,
      },
      {
        path: '/next-steps',
        element: <NextSteps />,
      },
      {
        path: '/review',
        element: <Review />,
      },
      {
        path: '/tags',
        element: <Tags />,
      },
      {
        path: '/tags/:tag',
        element: <TagDetail />,
      },
      {
        path: '/tools',
        element: <Tools />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '/review/session',
    element: <ReviewSession />,
  },
  {
    path: '/import',
    element: <Import />,
  },
  {
    path: '/document/:id',
    element: <DocumentDetail />,
  },
  {
    path: '/document/:id/edit',
    element: <DocumentEdit />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  }
]);

import QuickFlashcard from './components/QuickFlashcard';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <QuickFlashcard />
    </>
  );
}

export default App;
