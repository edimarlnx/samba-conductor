# Password Policy

This guide covers how password policies work in your organization's Active Directory domain and what to do when your
password expires or needs to be changed.

## How Password Policies Work

Your organization enforces password rules through Active Directory Group Policy. These rules typically include:

- **Minimum length** -- Passwords must meet a minimum character count (commonly 8 or more).
- **Complexity requirements** -- Passwords usually must contain a mix of uppercase letters, lowercase letters, numbers,
  and special characters.
- **Maximum age** -- Passwords expire after a set number of days (e.g., 90 days). You will need to change your password
  before it expires.
- **Password history** -- You cannot reuse a certain number of previous passwords.

The exact policy values are set by your domain administrators and may vary.

## Changing Your Password

1. Log in to Samba Conductor.
2. Go to **Change Password** from the navigation menu (or visit `/change-password`).
3. Enter your **current password**.
4. Enter and confirm your **new password**.
5. Click **Change Password**.

If your new password does not meet the domain's policy requirements, you will see an error message. Adjust your password
and try again.

## Expired Password

If your password has expired, you may be prompted to change it at your next login. Follow the on-screen instructions to
set a new password before you can continue.

## Must Change Password at Next Login

An administrator may flag your account to require a password change at next login. When this is set:

1. You will be prompted to change your password immediately after logging in.
2. Enter a new password that meets the domain policy requirements.
3. After the change succeeds, you will be logged in normally.

## Tips for Choosing a Good Password

- Use a passphrase of four or more unrelated words (e.g., "correct horse battery staple").
- Avoid personal information such as your name, username, or birthdate.
- Do not reuse passwords from other accounts or services.
- Consider using a password manager to generate and store strong passwords.

## Need Help?

If you are locked out of your account or cannot change your password, contact your IT administrator. They can reset your
password or unlock your account from the admin panel.
