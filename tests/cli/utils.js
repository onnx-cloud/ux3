/**
 * Shared CLI test utilities — shell-execution helpers for CLI integration tests.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
/**
 * Run a shell command string and return the exit code + output.
 * Resolves (never rejects) — non-zero exit codes are returned in `code`.
 */
export async function runCommand(cmd) {
    try {
        const { stdout, stderr } = await execAsync(cmd);
        return { code: 0, stdout, stderr };
    }
    catch (err) {
        return {
            code: typeof err.code === 'number' ? err.code : 1,
            stdout: err.stdout ?? '',
            stderr: err.stderr ?? '',
        };
    }
}
//# sourceMappingURL=utils.js.map