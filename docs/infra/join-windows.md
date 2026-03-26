# Joining a Windows Machine to the Domain

This guide explains how to join a Windows workstation or server to your Samba 4 Active Directory domain.

## Prerequisites

- Windows 10/11 Pro, Enterprise, or Education (Home edition does not support domain join)
- Windows Server 2016 or later
- Network connectivity to the Domain Controller
- DNS pointing to the DC (critical)
- Domain admin credentials

## Step 1: Configure DNS

The machine **must** use the Domain Controller as its DNS server.

1. Open **Settings** > **Network & Internet** > **Change adapter options**
2. Right-click your network adapter > **Properties**
3. Select **Internet Protocol Version 4 (TCP/IPv4)** > **Properties**
4. Set **Preferred DNS server** to the DC's IP address (e.g., `172.20.0.10`)
5. Click **OK**

### Verify DNS

Open Command Prompt and run:

```cmd
nslookup samdom.example.com
```

It should resolve to the DC's IP address.

## Step 2: Set the Computer Name

1. Open **Settings** > **System** > **About** > **Rename this PC (advanced)**
2. Click **Change...**
3. Set a meaningful computer name (e.g., `WORKSTATION01`)
4. Click **OK** and restart if prompted

## Step 3: Join the Domain

1. Open **Settings** > **System** > **About** > **Rename this PC (advanced)**
2. Click **Change...**
3. Under **Member of**, select **Domain**
4. Enter your domain name: `samdom.example.com`
5. Click **OK**
6. Enter domain admin credentials:
    - Username: `Administrator`
    - Password: your admin password
7. You should see: **"Welcome to the samdom.example.com domain"**
8. Restart the computer

## Step 4: Log In with a Domain Account

After restart:

1. On the login screen, click **Other user**
2. Enter domain credentials:
    - Username: `SAMDOM\username` or `username@samdom.example.com`
    - Password: the user's AD password

## Verification

After joining, verify in Samba Conductor:

- Go to **Admin** > **Computers** — the new machine should appear
- Go to **Admin** > **OUs** > **Domain Controllers** or **Computers** — the machine object should be visible

### From the DC (command line)

```bash
samba-tool computer list
# Should show your new computer name
```

## Troubleshooting

### "The specified domain either does not exist or could not be contacted"

- Verify DNS is set to the DC's IP
- Try `ping samdom.example.com` from the workstation
- Try `nslookup _ldap._tcp.samdom.example.com`
- Ensure no firewall is blocking ports 53, 88, 389, 445, 636

### "The account is not authorized to log in from this station"

- Ensure the user account is enabled in Samba Conductor
- Check if the user is in the correct group

### Clock Skew Error

Kerberos requires clocks to be synchronized (within 5 minutes):

```cmd
w32tm /config /manualpeerlist:dc1.samdom.example.com /syncfromflags:manual /update
w32tm /resync
```

## Required Ports

Ensure these ports are open between the workstation and the DC:

| Port | Protocol | Service                  |
|------|----------|--------------------------|
| 53   | TCP/UDP  | DNS                      |
| 88   | TCP/UDP  | Kerberos                 |
| 135  | TCP      | RPC Endpoint Mapper      |
| 389  | TCP/UDP  | LDAP                     |
| 445  | TCP      | SMB                      |
| 464  | TCP/UDP  | Kerberos Password Change |
| 636  | TCP      | LDAPS                    |
| 3268 | TCP      | Global Catalog           |
