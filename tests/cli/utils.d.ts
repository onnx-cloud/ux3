export interface RunResult {
    code: number;
    stdout: string;
    stderr: string;
}
/**
 * Run a shell command string and return the exit code + output.
 * Resolves (never rejects) — non-zero exit codes are returned in `code`.
 */
export declare function runCommand(cmd: string): Promise<RunResult>;
//# sourceMappingURL=utils.d.ts.map