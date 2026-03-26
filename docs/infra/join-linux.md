# Joining a Linux Machine to the Domain

This guide covers joining a Linux machine to your Samba 4 Active Directory domain using **SSSD** (recommended) or
**Winbind**.

## Prerequisites

- Linux distribution with `realmd` and `sssd` (Ubuntu, Fedora, RHEL, Debian)
- Network connectivity to the Domain Controller
- DNS pointing to the DC
- Domain admin credentials

## Method 1: Using realmd + SSSD (Recommended)

### Step 1: Install Packages

**Ubuntu/Debian:**

```bash
sudo apt install realmd sssd sssd-tools adcli samba-common-bin krb5-user packagekit
```

When prompted for the Kerberos realm, enter: `SAMDOM.EXAMPLE.COM` (uppercase)

**Fedora/RHEL:**

```bash
sudo dnf install realmd sssd sssd-tools adcli samba-common-tools krb5-workstation
```

### Step 2: Configure DNS

Edit `/etc/resolv.conf` or use NetworkManager:

```bash
# /etc/resolv.conf
nameserver 172.20.0.10
search samdom.example.com
```

Or with NetworkManager:

```bash
sudo nmcli connection modify "Wired connection 1" ipv4.dns "172.20.0.10"
sudo nmcli connection modify "Wired connection 1" ipv4.dns-search "samdom.example.com"
sudo nmcli connection up "Wired connection 1"
```

### Step 3: Discover the Domain

```bash
realm discover samdom.example.com
```

Expected output:

```
samdom.example.com
  type: kerberos
  realm-name: SAMDOM.EXAMPLE.COM
  domain-name: samdom.example.com
  configured: no
  ...
```

### Step 4: Join the Domain

```bash
sudo realm join samdom.example.com -U Administrator
```

Enter the admin password when prompted. If successful, no output is shown.

### Step 5: Verify

```bash
realm list
```

Should show `configured: kerberos-member`.

```bash
id administrator@samdom.example.com
```

Should return UID/GID information.

### Step 6: Configure SSSD (Optional Tuning)

Edit `/etc/sssd/sssd.conf`:

```ini
[sssd]
domains = samdom.example.com
config_file_version = 2
services = nss, pam

[domain/samdom.example.com]
ad_domain = samdom.example.com
krb5_realm = SAMDOM.EXAMPLE.COM
realmd_tags = manages-system joined-with-adcli
id_provider = ad
access_provider = ad
fallback_homedir = /home/%u@%d
default_shell = /bin/bash

# Allow login without full domain suffix
use_fully_qualified_names = False
```

Restart SSSD:

```bash
sudo systemctl restart sssd
```

### Step 7: Enable Home Directory Creation

```bash
sudo pam-auth-update --enable mkhomedir
```

### Step 8: Login with Domain Account

```bash
su - username
# or
ssh username@this-machine
```

## Method 2: Using Winbind

### Install

**Ubuntu/Debian:**

```bash
sudo apt install winbind libnss-winbind libpam-winbind krb5-user samba-common-bin
```

**Fedora/RHEL:**

```bash
sudo dnf install samba-winbind samba-winbind-clients krb5-workstation
```

### Configure

Edit `/etc/samba/smb.conf`:

```ini
[global]
workgroup = SAMDOM
realm = SAMDOM.EXAMPLE.COM
security = ADS
idmap config * : backend = tdb
idmap config * : range = 10000-20000
idmap config SAMDOM : backend = rid
idmap config SAMDOM : range = 20001-30000
winbind use default domain = yes
winbind enum users = yes
winbind enum groups = yes
```

### Join

```bash
sudo net ads join -U Administrator
```

### Enable NSS

Edit `/etc/nsswitch.conf`:

```
passwd: files winbind
group:  files winbind
```

### Test

```bash
wbinfo -u   # List domain users
wbinfo -g   # List domain groups
```

## Verification in Samba Conductor

After joining, the computer should appear in:

- **Admin** > **Computers** — with hostname and OS info
- **Admin** > **OUs** — under the appropriate container

## Leaving the Domain

```bash
# With realmd
sudo realm leave samdom.example.com

# With Winbind
sudo net ads leave -U Administrator
```

## Troubleshooting

### "realm: Couldn't join realm"

- Check DNS: `nslookup samdom.example.com`
- Check time sync: `timedatectl` — must be within 5 minutes of DC
- Check connectivity: `nc -zv dc1.samdom.example.com 389`

### "System error: No such file or directory" on realm discover

- Install missing packages: `sudo apt install packagekit`

### Users can't login after join

- Check SSSD is running: `sudo systemctl status sssd`
- Check logs: `sudo journalctl -u sssd`
- Verify: `id username@samdom.example.com`

### Time Sync

Kerberos requires synchronized clocks. Configure NTP:

```bash
sudo timedatectl set-ntp true
# Or point to the DC as NTP server
sudo nano /etc/systemd/timesyncd.conf
# NTP=dc1.samdom.example.com
sudo systemctl restart systemd-timesyncd
```
