// Default settings values used when no record exists in the database
export const SETTINGS_DEFAULTS = {
  'selfService.editableFields': {
    givenName: { enabled: true, label: 'First Name' },
    surname: { enabled: true, label: 'Last Name' },
    mail: { enabled: false, label: 'Email' },
    telephoneNumber: { enabled: true, label: 'Phone' },
    description: { enabled: true, label: 'Description' },
    company: { enabled: false, label: 'Company' },
    department: { enabled: false, label: 'Department' },
    physicalDeliveryOffice: { enabled: false, label: 'Office' },
  },
  'sync.account': {
    configured: false,
    username: '',
    encryptedPassword: null,
  },
};
