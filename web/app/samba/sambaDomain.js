import { runSambaTool } from './sambaExec';
import { getSambaConfig } from './sambaConfig';

// Returns domain information from samba-tool
export async function getDomainInfo() {
  const { realm, baseDn } = getSambaConfig();

  try {
    const { stdout } = await runSambaTool({ args: ['domain', 'info', realm] });
    const info = parseDomainInfo({ output: stdout });

    return {
      ...info,
      realm,
      baseDn,
    };
  } catch (error) {
    // Return basic config info if samba-tool is not available
    return {
      realm,
      baseDn,
      forest: realm,
      domain: realm,
      netbios: realm.split('.')[0],
      error: error.message,
    };
  }
}

// Parses samba-tool domain info output into an object
function parseDomainInfo({ output }) {
  const info = {};
  const lines = output.split('\n');

  lines.forEach((line) => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
      info[cleanKey] = valueParts.join(':').trim();
    }
  });

  return info;
}

// Returns domain functional level
export async function getDomainLevel() {
  try {
    const { stdout } = await runSambaTool({ args: ['domain', 'level', 'show'] });
    return parseDomainInfo({ output: stdout });
  } catch (error) {
    return { error: error.message };
  }
}
