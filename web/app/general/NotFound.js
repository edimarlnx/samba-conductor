import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { Button } from '../components/Button';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-6xl font-bold text-gray-700">404</h1>
      <p className="mt-4 text-lg text-gray-400">Page not found</p>
      <Button
        primary
        onClick={() => navigate(RoutePaths.DASHBOARD)}
        className="mt-8"
      >
        Go to Dashboard
      </Button>
    </div>
  );
}
