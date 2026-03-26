export const RoutePaths = {
  // Authentication
  LOGIN: '/login',

  // Self-Service (internet-facing)
  SELF_SERVICE: '/',
  CHANGE_PASSWORD: '/change-password',
  PROFILE: '/profile',

  // Admin (internal network only)
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_CREATE: '/admin/users/new',
  ADMIN_USER_EDIT: '/admin/users/:username/edit',
  ADMIN_GROUPS: '/admin/groups',
  ADMIN_GROUP_CREATE: '/admin/groups/new',
  ADMIN_GROUP_EDIT: '/admin/groups/:groupName/edit',
  ADMIN_OUS: '/admin/ous',
  ADMIN_COMPUTERS: '/admin/computers',
  ADMIN_SERVICE_ACCOUNTS: '/admin/service-accounts',
  ADMIN_DNS: '/admin/dns',
  ADMIN_GPOS: '/admin/gpos',
  ADMIN_DOMAIN: '/admin/domain',
    ADMIN_OAUTH_CLIENTS: '/admin/oauth/clients',
    ADMIN_OAUTH_REALMS: '/admin/oauth/realms',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_DR: '/admin/dr',
};
