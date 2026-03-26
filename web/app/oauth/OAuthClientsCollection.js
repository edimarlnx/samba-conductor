import {createCollection} from 'meteor/quave:collections';
import SimpleSchema from 'simpl-schema';

const OAuthClientSchema = new SimpleSchema({
    clientId: {type: String},
    clientName: {type: String},
    description: {type: String, optional: true},
    redirectUris: {type: Array},
    'redirectUris.$': {type: String},
    grants: {type: Array},
    'grants.$': {type: String},
    realm: {type: String, defaultValue: 'default'},
    scopes: {type: Array, optional: true},
    'scopes.$': {type: String},
    trusted: {type: Boolean, defaultValue: false},
    enabled: {type: Boolean, defaultValue: true},
    createdAt: {type: Date},
    createdBy: {type: String, optional: true},
});

export const OAuthClientsCollection = createCollection({
    name: 'oauth_clients_config',
    schema: OAuthClientSchema,
});
