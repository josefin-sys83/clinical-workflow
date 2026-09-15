import { createBrowserRouter } from 'react-router';
import ReviewPage from './pages/ReviewPage';

export const router = createBrowserRouter([
  { path: '/', Component: ReviewPage },
]);
