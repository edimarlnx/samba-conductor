import React from 'react';
import { useLoggedUser } from 'meteor/quave:logged-user-react';
import { Navigate } from 'react-router-dom';
import { RoutePaths } from '../general/RoutePaths';
import { Loading } from '../components/Loading';

// Redirects non-admin users to the self-service portal
export function AdminGuard({ children }) {
  const { loggedUser, isLoadingLoggedUser } = useLoggedUser();

  if (isLoadingLoggedUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loading />
      </div>
    );
  }

  if (!loggedUser) {
    return <Navigate to={RoutePaths.LOGIN} replace />;
  }

  if (!loggedUser.profile?.isAdmin) {
    return <Navigate to={RoutePaths.SELF_SERVICE} replace />;
  }

  return <>{children}</>;
}
