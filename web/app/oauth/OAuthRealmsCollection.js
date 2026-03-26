import {createCollection} from 'meteor/quave:collections';
import SimpleSchema from 'simpl-schema';

const OAuthRealmSchema = new SimpleSchema({
    name: {type: String},
    displayName: {type: String},
    description: {type: String, optional: true},
    allowedScopes: {type: Array},
    'allowedScopes.$': {type: String},
    defaultScopes: {type: Array, optional: true},
    'defaultScopes.$': {type: String},
    adGroupAccess: {type: String, optional: true},
    enabled: {type: Boolean, defaultValue: true},
    createdAt: {type: Date},
});

export const OAuthRealmsCollection = createCollection({
    name: 'oauth_realms',
    schema: OAuthRealmSchema,
});
