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
  const { dockerContainer } = getSambaConfig();

  // Add authentication if credentials provided
  const authArgs = credentials
    ? [...args, '-U', `${credentials.username}%${credentials.password}`]
    : args;

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
    // Sanitize: never log credentials
    const sanitizedArgs = args.join(' ');
    console.error(`[SambaTool] Command failed: samba-tool ${sanitizedArgs}`, message);

    throw new Meteor.Error(
      'samba.exec.failed',
      `samba-tool error: ${message}`
    );
  }
}

// Parses samba-tool list output into an array of strings
export function parseListOutput({ output }) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
