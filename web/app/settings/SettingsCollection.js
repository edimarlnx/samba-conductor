import { createCollection } from 'meteor/quave:collections';
import SimpleSchema from 'simpl-schema';

const SettingsSchema = new SimpleSchema({
  key: { type: String },
  value: { type: Object, blackbox: true },
});

export const SettingsCollection = createCollection({
  name: 'appSettings',
  schema: SettingsSchema,
});
