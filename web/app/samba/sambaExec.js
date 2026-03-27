import { execFile } from 'child_process';
import { promisify } from 'util';
import { Meteor } from 'meteor/meteor';
import { getSambaConfig } from './sambaConfig';

const execFileAsync = promisify(execFile);

const SAMBA_TOOL_PATH = '/usr/bin/samba-tool';
const DOCKER_PATH = '/usr/bin/docker';
const DEFAULT_TIMEOUT = 30000;

// Executes samba-tool commands safely using execFile (no shell injection)
// credentials: { username, password } — if provided, adds -U username%password
export async function runSambaTool({ args, credentials, timeout = DEFAULT_TIMEOUT }) {
  const { dockerContainer, sambaToolUrl } = getSambaConfig();

  // Add authentication if credentials provided
  const authArgs = credentials
    ? [...args, '-U', `${credentials.username}%${credentials.password}`]
    : args;

  // Add remote host connection if sambaToolUrl is configured.
  // Some subcommands (e.g. "domain info") don't support -H, so skip for those.
  if (sambaToolUrl && !isCommandWithoutHostFlag({ args })) {
    authArgs.push('-H', sambaToolUrl, '--option=tls verify peer = no_check');
  }

  try {
    let stdout, stderr;

    if (dockerContainer) {
      const dockerArgs = ['exec', dockerContainer, SAMBA_TOOL_PATH, ...authArgs];
      ({ stdout, stderr } = await execFileAsync(DOCKER_PATH, dockerArgs, {
        timeout,
        env: { ...process.env },
      }));
    } else {
      ({ stdout, stderr } = await execFileAsync(SAMBA_TOOL_PATH, authArgs, {
        timeout,
        env: { ...process.env },
      }));
    }

    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    const message = error.stderr || error.message;
    // Sanitize: strip credentials from error messages (never expose -U user%pass)
    const sanitizedMessage = message.replace(/-U\s+\S+/g, '-U ***');
    const sanitizedArgs = args.join(' ');
    console.error(`[SambaTool] Command failed: samba-tool ${sanitizedArgs}`, sanitizedMessage);

    throw new Meteor.Error(
      'samba.exec.failed',
        `samba-tool error: ${sanitizedMessage}`,
    );
  }
}

// Subcommands that don't support the -H flag
const COMMANDS_WITHOUT_HOST_FLAG = [
  'domain info',
  'domain level',
];

function isCommandWithoutHostFlag({ args }) {
  const subcommand = args.slice(0, 2).join(' ');
  return COMMANDS_WITHOUT_HOST_FLAG.includes(subcommand);
}

// Parses samba-tool list output into an array of strings
export function parseListOutput({ output }) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
