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

function App() {
  return <RouterProvider router={router} />;
}

export default App;
