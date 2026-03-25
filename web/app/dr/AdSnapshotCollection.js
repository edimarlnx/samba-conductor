import { createCollection } from 'meteor/quave:collections';
import SimpleSchema from 'simpl-schema';

const AdSnapshotSchema = new SimpleSchema({
  type: {
    type: String,
    allowedValues: ['users', 'groups', 'domain', 'hashes'],
  },
  snapshotAt: { type: Date },
  data: { type: Array, optional: true },
  'data.$': { type: Object, blackbox: true },
  // Encrypted with DR Key — contains sensitive data (password hashes)
  sensitiveData: { type: Object, optional: true, blackbox: true },
});

export const AdSnapshotCollection = createCollection({
  name: 'adSnapshots',
  schema: AdSnapshotSchema,
});
