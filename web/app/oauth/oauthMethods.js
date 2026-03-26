import crypto from 'crypto';
import {Meteor} from 'meteor/meteor';
import {check, Match} from 'meteor/check';
import {OAuthClientsCollection} from './OAuthClientsCollection';
import {OAuthRealmsCollection} from './OAuthRealmsCollection';

async function requireAdmin({userId}) {
    if (!userId) throw new Meteor.Error('not-authorized', 'You must be logged in');
    const user = await Meteor.users.findOneAsync(userId);
    if (!user?.profile?.isAdmin) throw new Meteor.Error('not-authorized', 'Admin access required');
}

function generateId() {
    return crypto.randomUUID();
}

function generateSecret() {
    return crypto.randomBytes(32).toString('hex');
}

Meteor.methods({
    // --- Clients ---

    'oauth.clients.list': async function listClients() {
        await requireAdmin({userId: this.userId});
        return OAuthClientsCollection.find({}, {sort: {createdAt: -1}}).fetchAsync();
    },

    'oauth.clients.get': async function getClient({clientId}) {
        await requireAdmin({userId: this.userId});
        check(clientId, String);
        return OAuthClientsCollection.findOneAsync({clientId});
    },

    'oauth.clients.create': async function createClient({
                                                            clientName,
                                                            description,
                                                            redirectUris,
                                                            realm,
                                                            scopes,
                                                            trusted
                                                        }) {
        await requireAdmin({userId: this.userId});
        check(clientName, String);
        check(redirectUris, [String]);

        const clientId = generateId();
        const clientSecret = generateSecret();

        // Register with the OAuth2 server package
        const {oauth2server} = require('../../server/oauth2');
        await oauth2server.registerClient({
            title: clientName,
            homepage: redirectUris[0] || '',
            description: description || '',
            privacyLink: '',
            redirectUris: redirectUris.join(','),
            grants: ['authorization_code', 'refresh_token'],
            clientId,
            secret: clientSecret,
        });

        // Save in our config collection (for admin UI)
        await OAuthClientsCollection.insertAsync({
            clientId,
            clientName,
            description: description || '',
            redirectUris,
            grants: ['authorization_code', 'refresh_token'],
            realm: realm || 'default',
            scopes: scopes || ['openid', 'profile', 'email'],
            trusted: trusted || false,
            enabled: true,
            createdAt: new Date(),
            createdBy: this.userId,
        });

        // Return the secret — shown only once
        return {clientId, clientSecret};
    },

    'oauth.clients.update': async function updateClient({
                                                            clientId,
                                                            clientName,
                                                            description,
                                                            redirectUris,
                                                            realm,
                                                            scopes,
                                                            trusted,
                                                            enabled
                                                        }) {
        await requireAdmin({userId: this.userId});
        check(clientId, String);

        const updates = {};
        if (clientName !== undefined) updates.clientName = clientName;
        if (description !== undefined) updates.description = description;
        if (redirectUris !== undefined) updates.redirectUris = redirectUris;
        if (realm !== undefined) updates.realm = realm;
        if (scopes !== undefined) updates.scopes = scopes;
        if (trusted !== undefined) updates.trusted = trusted;
        if (enabled !== undefined) updates.enabled = enabled;

        await OAuthClientsCollection.updateAsync({clientId}, {$set: updates});
        return {success: true};
    },

    'oauth.clients.delete': async function deleteClient({clientId}) {
        await requireAdmin({userId: this.userId});
        check(clientId, String);
        await OAuthClientsCollection.removeAsync({clientId});
        return {success: true};
    },

    'oauth.clients.resetSecret': async function resetClientSecret({clientId}) {
        await requireAdmin({userId: this.userId});
        check(clientId, String);

        const newSecret = generateSecret();

        // Update in the oauth_clients collection (package's collection)
        const {Mongo} = require('meteor/mongo');
        const oauthClients = new Mongo.Collection('oauth_clients');
        await oauthClients.updateAsync({clientId}, {$set: {secret: newSecret}});

        return {clientSecret: newSecret};
    },

    // --- Realms ---

    'oauth.realms.list': async function listRealms() {
        await requireAdmin({userId: this.userId});
        return OAuthRealmsCollection.find({}, {sort: {name: 1}}).fetchAsync();
    },

    'oauth.realms.get': async function getRealm({name}) {
        await requireAdmin({userId: this.userId});
        check(name, String);
        return OAuthRealmsCollection.findOneAsync({name});
    },

    'oauth.realms.create': async function createRealm({
                                                          name,
                                                          displayName,
                                                          description,
                                                          allowedScopes,
                                                          defaultScopes,
                                                          adGroupAccess
                                                      }) {
        await requireAdmin({userId: this.userId});
        check(name, String);
        check(displayName, String);

        const existing = await OAuthRealmsCollection.findOneAsync({name});
        if (existing) throw new Meteor.Error('exists', 'Realm already exists');

        await OAuthRealmsCollection.insertAsync({
            name,
            displayName,
            description: description || '',
            allowedScopes: allowedScopes || ['openid', 'profile', 'email', 'groups'],
            defaultScopes: defaultScopes || ['openid', 'profile'],
            adGroupAccess: adGroupAccess || '',
            enabled: true,
            createdAt: new Date(),
        });

        return {success: true};
    },

    'oauth.realms.update': async function updateRealm({
                                                          name,
                                                          displayName,
                                                          description,
                                                          allowedScopes,
                                                          defaultScopes,
                                                          adGroupAccess,
                                                          enabled
                                                      }) {
        await requireAdmin({userId: this.userId});
        check(name, String);

        const updates = {};
        if (displayName !== undefined) updates.displayName = displayName;
        if (description !== undefined) updates.description = description;
        if (allowedScopes !== undefined) updates.allowedScopes = allowedScopes;
        if (defaultScopes !== undefined) updates.defaultScopes = defaultScopes;
        if (adGroupAccess !== undefined) updates.adGroupAccess = adGroupAccess;
        if (enabled !== undefined) updates.enabled = enabled;

        await OAuthRealmsCollection.updateAsync({name}, {$set: updates});
        return {success: true};
    },

    'oauth.realms.delete': async function deleteRealm({name}) {
        await requireAdmin({userId: this.userId});
        check(name, String);
        if (name === 'default') throw new Meteor.Error('protected', 'Cannot delete the default realm');
        await OAuthRealmsCollection.removeAsync({name});
        return {success: true};
    },
});
