import { Meteor } from 'meteor/meteor';

import '../app/infra/migrations';
import '../app/infra/cron';

// Samba service methods
import '../app/auth/authMethods';
import '../app/dashboard/dashboardMethods';
import '../app/users/usersMethods';
import '../app/groups/groupsMethods';
import '../app/domain/domainMethods';

import './rest';

Meteor.startup(() => {});
