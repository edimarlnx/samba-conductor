import { execFile } from 'child_process';
import { promisify } from 'util';
import { Meteor } from 'meteor/meteor';
import { getSambaConfig } from './sambaConfig';

const execFileAsync = promisify(execFile);

const SAMBA_TOOL_PATH = '/usr/bin/samba-tool';
const DOCKER_PATH = '/usr/bin/docker';
const DEFAULT_TIMEOUT = 30000;

// Executes samba-tool commands safely using execFile (no shell injection)
// When dockerContainer is set in config, runs via "docker exec" instead of locally
export async function runSambaTool({ args, timeout = DEFAULT_TIMEOUT }) {
  const { dockerContainer } = getSambaConfig();

  try {
    let stdout, stderr;

    if (dockerContainer) {
      // Run samba-tool inside the Docker container
      const dockerArgs = ['exec', dockerContainer, SAMBA_TOOL_PATH, ...args];
      ({ stdout, stderr } = await execFileAsync(DOCKER_PATH, dockerArgs, {
        timeout,
        env: { ...process.env },
      }));
    } else {
      // Run samba-tool locally (production — app runs on the DC itself)
      ({ stdout, stderr } = await execFileAsync(SAMBA_TOOL_PATH, args, {
        timeout,
        env: { ...process.env },
      }));
    }

    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    const message = error.stderr || error.message;
    console.error(`[SambaTool] Command failed: samba-tool ${args.join(' ')}`, message);

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
