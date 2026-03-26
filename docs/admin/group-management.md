# Group Management

Manage Active Directory groups -- create groups, manage their members, move groups between organizational units, and delete groups.

<!-- screenshot: groups-list -->

## Accessing This Page

Navigate to **Admin** > **Groups** or go to `/admin/groups`.

## Features

### Group List

The group list displays all Active Directory groups in a searchable table with the following columns:

- **Name** -- the group's sAMAccountName
- **Description** -- the group's description attribute
- **Members** -- number of members in the group
- **Actions** -- Edit, Move, and Delete buttons

Use the search bar to filter groups by any visible field.

### Creating a Group

1. Click the **New Group** button in the top-right corner.
2. Fill in the form fields.
3. Click **Create Group**.

**Route:** `/admin/groups/new`

<!-- screenshot: group-form-create -->

| Field | Required | Description |
|-------|----------|-------------|
| Group Name | Yes | The sAMAccountName for the group (e.g., `developers`). Cannot be changed after creation. |
| Description | No | Free-text description of the group's purpose. |

### Editing a Group

1. From the group list, click **Edit** on the desired group row.

**Route:** `/admin/groups/:groupName/edit`

<!-- screenshot: group-form-edit -->

The edit page shows the group's properties (name and description) at the top. The **Group Name** field is read-only when editing.

Below the properties, you will find the **Location (OU)** section and the **Members** section.

### Managing Members

Member management is available only when editing an existing group.

<!-- screenshot: group-members -->

**Adding a member:**
1. Open the group's edit form.
2. In the **Members** section, type a username into the text field.
3. Click **Add** (or press Enter).

**Removing a member:**
1. In the Members section, find the member in the list.
2. Click **Remove** next to the member name.

The total member count is displayed in the section header.

### Moving a Group to a Different OU

You can move a group from two places:

**From the group list:**
1. Click **Move** in the Actions column.
2. A modal appears with an OU picker.
3. Select the destination OU.
4. Click **Move**.

**From the edit form:**
1. In the **Location (OU)** section, the current OU is displayed.
2. Use the OU picker to select a new location. The move happens immediately upon selection.

<!-- screenshot: group-move-ou -->

### Deleting a Group

1. From the group list, click **Delete** in the Actions column.
2. A confirmation dialog warns that deletion cannot be undone.
3. Click **Delete** to confirm.

This action permanently removes the group from Active Directory. It does not delete the group's members.
