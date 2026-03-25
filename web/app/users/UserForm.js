import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { useNavigate, useParams } from 'react-router-dom';
import { useAlert } from 'meteor/quave:alert-react-tailwind';
import { RoutePaths } from '../general/RoutePaths';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';

export function UserForm() {
  const navigate = useNavigate();
  const { username: editUsername } = useParams();
  const { openAlert } = useAlert();
  const isEditing = !!editUsername;

  const [form, setForm] = useState({
    username: '',
    password: '',
    givenName: '',
    surname: '',
    mail: '',
  });
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditing) return;

    async function fetchUser() {
      try {
        const user = await Meteor.callAsync('samba.users.get', { username: editUsername });
        if (user) {
          setForm({
            username: user.username,
            password: '',
            givenName: user.givenName || '',
            surname: user.surname || '',
            mail: user.email || '',
          });
        }
      } catch (error) {
        openAlert(error.reason || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [editUsername]);

  function handleChange({ field, value }) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (isEditing) {
        // For editing, only reset password if provided
        if (form.password) {
          await Meteor.callAsync('samba.users.resetPassword', {
            username: editUsername,
            newPassword: form.password,
          });
        }
        openAlert('User updated successfully');
      } else {
        await Meteor.callAsync('samba.users.create', {
          username: form.username,
          password: form.password,
          givenName: form.givenName,
          surname: form.surname,
          mail: form.mail,
        });
        openAlert('User created successfully');
      }

      navigate(RoutePaths.USERS);
    } catch (error) {
      openAlert(error.reason || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          {isEditing ? `Edit User: ${editUsername}` : 'New User'}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {isEditing ? 'Update user properties' : 'Create a new Active Directory user'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        <FormField
          label="Username"
          value={form.username}
          onChange={(value) => handleChange({ field: 'username', value })}
          required
          disabled={isEditing}
          placeholder="john.doe"
        />

        <FormField
          label={isEditing ? 'New Password (leave blank to keep current)' : 'Password'}
          value={form.password}
          onChange={(value) => handleChange({ field: 'password', value })}
          type="password"
          required={!isEditing}
        />

        <FormField
          label="First Name"
          value={form.givenName}
          onChange={(value) => handleChange({ field: 'givenName', value })}
          placeholder="John"
        />

        <FormField
          label="Last Name"
          value={form.surname}
          onChange={(value) => handleChange({ field: 'surname', value })}
          placeholder="Doe"
        />

        <FormField
          label="Email"
          value={form.mail}
          onChange={(value) => handleChange({ field: 'mail', value })}
          type="email"
          placeholder="john.doe@example.com"
        />

        <div className="flex gap-3 pt-4">
          <Button primary type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
          </Button>
          <Button secondary onClick={() => navigate(RoutePaths.USERS)} type="button">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', required = false, disabled = false, placeholder = '' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
      />
    </div>
  );
}
