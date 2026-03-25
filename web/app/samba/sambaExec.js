import { execFile } from 'child_process';
import { promisify } from 'util';
import { Meteor } from 'meteor/meteor';

const execFileAsync = promisify(execFile);

const SAMBA_TOOL_PATH = '/usr/bin/samba-tool';
const DEFAULT_TIMEOUT = 30000;

// Executes samba-tool commands safely using execFile (no shell injection)
export async function runSambaTool({ args, timeout = DEFAULT_TIMEOUT }) {
  try {
    const { stdout, stderr } = await execFileAsync(SAMBA_TOOL_PATH, args, {
      timeout,
      env: { ...process.env },
    });

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
