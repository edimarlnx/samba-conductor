import { Meteor } from 'meteor/meteor';

import '../app/infra/migrations';
import '../app/infra/cron';

// Samba service methods
import '../app/auth/authMethods';
import '../app/dashboard/dashboardMethods';
import '../app/users/usersMethods';
import '../app/groups/groupsMethods';
import '../app/ous/ousMethods';
import '../app/computers/computersMethods';
import '../app/serviceaccounts/serviceAccountsMethods';
import '../app/dns/dnsMethods';
import '../app/gpo/gpoMethods';
import '../app/domain/domainMethods';

// Self-service methods
import '../app/selfservice/selfServiceMethods';

// Settings methods
import '../app/settings/settingsMethods';

// Disaster Recovery
import '../app/dr/drMethods';

import './rest';

Meteor.startup(() => {});
