import React from 'react';
import { useLoggedUser } from 'meteor/quave:logged-user-react';
import { Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { RoutePaths } from '../general/RoutePaths';
import { Loading } from '../components/Loading';
import { ErrorFallback } from '../components/ErrorFallback';

function InnerLayout({ children, onlyLogged, onlyAnonymous }) {
  const { loggedUser, isLoadingLoggedUser } = useLoggedUser();

  if (isLoadingLoggedUser) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <Loading />
      </div>
    );
  }

  if (onlyLogged) {
    if (!loggedUser) {
      return <Navigate to={RoutePaths.LOGIN} replace />;
    }
    return <>{children}</>;
  }

  if (onlyAnonymous) {
    if (loggedUser) {
      if (loggedUser.profile?.mustChangePassword) {
        return <Navigate to={RoutePaths.CHANGE_PASSWORD} replace />;
      }
      if (loggedUser.profile?.isAdmin) {
        return <Navigate to={RoutePaths.ADMIN_DASHBOARD} replace />;
      }
      return <Navigate to={RoutePaths.SELF_SERVICE} replace />;
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}

export function ConditionalLayout({ ...props }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <InnerLayout {...props} />
    </ErrorBoundary>
  );
}
