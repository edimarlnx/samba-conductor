import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { Button } from '../components/Button';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-20">
      <h1 className="text-5xl md:text-6xl font-bold text-fg-muted">404</h1>
      <p className="mt-4 text-lg text-fg-secondary">Page not found</p>
      <Button
        primary
        onClick={() => navigate(RoutePaths.SELF_SERVICE)}
        className="mt-8"
      >
        Go Home
      </Button>
    </div>
  );
}
