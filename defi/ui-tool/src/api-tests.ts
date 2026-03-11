import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const apiTestsDir = path.resolve(__dirname, '../../api-tests');
const apiTestsSrcDir = path.join(apiTestsDir, 'src');

function extractTestNames(filePath: string): string[] {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const testNameRegex = /(?:it|test)(?:\.(?:only|skip|todo|concurrent))?\s*\(\s*['"`]([^'"`]+)['"`]/g;

        const testNames = new Set<string>();
        let match;
        // biome-ignore lint/suspicious/noAssignInExpressions: standard regex execution
        while ((match = testNameRegex.exec(content)) !== null) {
            testNames.add(match[1]);
        }

        return Array.from(testNames).sort((a, b) => a.localeCompare(b));
    } catch {
        return [];
    }
}

function loadTestCategories() {
    const categories: string[] = ['all'];
    const testFilesByCategory: Record<string, string[]> = {};
    const testNamesByFile: Record<string, string[]> = {};

    try {
        const dirs = fs.readdirSync(apiTestsSrcDir, { withFileTypes: true });

        for (const dir of dirs) {
            if (!dir.isDirectory()) continue;

            const categoryName = dir.name;
            const categoryPath = path.join(apiTestsSrcDir, categoryName);

            const files = fs.readdirSync(categoryPath)
                .filter(file => file.endsWith('.test.ts'))
                .sort((a, b) => a.localeCompare(b));

            if (files.length === 0) continue;

            categories.push(categoryName);
            testFilesByCategory[categoryName] = files;

            for (const file of files) {
                const names = extractTestNames(path.join(categoryPath, file));
                if (names.length > 0) {
                    testNamesByFile[`${categoryName}/${file}`] = names;
                }
            }
        }
        categories.sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
    } catch (error) {
        console.error('[API Tests] Error reading test directories:', error);
    }

    return { categories, testFilesByCategory, testNamesByFile };
}

export const {
    categories: apiTestCategories,
    testFilesByCategory: apiTestFiles,
    testNamesByFile: apiTestNames,
} = loadTestCategories();

console.log(`[API Tests] Loaded ${apiTestCategories.length - 1} test categories with ${Object.values(apiTestFiles).flat().length} test files`);

export interface ApiTestOptions {
    category?: string;
    testFile?: string;
    testName?: string;
    verbose?: boolean;
    baseApiUrl?: string;
    proApiUrl?: string;
    coinsUrl?: string;
    yieldsUrl?: string;
}

export interface TestResult {
    testSuites: { passed: number; failed: number; skipped: number; todo: number; total: number };
    tests: { passed: number; failed: number; skipped: number; todo: number; total: number };
    duration: string;
    success: boolean;
}

let currentTestProcess: ChildProcess | null = null;


export function stopApiTests(): boolean {
    if (currentTestProcess) {
        currentTestProcess.kill('SIGTERM');
        currentTestProcess = null;
        return true;
    }
    return false;
}

function safeSend(ws: any, message: unknown) {
    if (ws.readyState === 1 /* OPEN */) {
        try {
            ws.send(typeof message === 'string' ? message : JSON.stringify(message));
        } catch (e) {
            console.error('[API Tests] Error sending to websocket:', e);
        }
    }
}

export async function runApiTests(
    ws: any,
    options: ApiTestOptions
): Promise<TestResult | null> {
    const { category = 'all', testFile, testName, verbose = true, baseApiUrl, proApiUrl, coinsUrl, yieldsUrl } = options;

    if (category !== 'all' && !apiTestCategories.includes(category)) {
        safeSend(ws, { type: 'api-test-error', content: 'Invalid category' });
        return null;
    }
    if (testFile && category === 'all') {
        safeSend(ws, { type: 'api-test-error', content: 'Cannot specify testFile when category is "all"' });
        return null;
    }
    if (testFile && category !== 'all') {
        const allowedFiles = apiTestFiles[category] || [];
        if (!allowedFiles.includes(testFile)) {
            safeSend(ws, { type: 'api-test-error', content: 'Invalid test file' });
            return null;
        }
    }
    if (testName) {
        let isValid = false;
        if (testFile && category !== 'all') {
            const allowedNames = apiTestNames[`${category}/${testFile}`] || [];
            isValid = allowedNames.includes(testName);
        } else {
            for (const [fileKey, names] of Object.entries(apiTestNames)) {
                if ((category === 'all' || fileKey.startsWith(`${category}/`)) && names.includes(testName)) {
                    isValid = true;
                    break;
                }
            }
        }
        if (!isValid) {
            safeSend(ws, { type: 'api-test-error', content: 'Invalid test name' });
            return null;
        }
    }


    const args = [
        category !== 'all' ? `src/${category}/${testFile || ''}` : '',
        testName ? `-t="${testName}"` : '', // Support test names with spaces
        verbose ? '--verbose' : '',
        '--passWithNoTests'
    ].filter(Boolean);

    console.log(`[API Tests] Running: npx jest ${args.join(' ')}`);
    console.log(`[API Tests] Category: ${category}${testFile ? `, File: ${testFile}` : ''}`);

    return new Promise((resolve) => {
        const npxPath = 'npx';

        const testProcess = spawn(npxPath, ['jest', ...args], {
            cwd: apiTestsDir,
            env: {
                ...process.env,
                FORCE_COLOR: '1',
                ...(baseApiUrl ? { BASE_API_URL: baseApiUrl, BETA_API_URL: baseApiUrl } : {}),
                ...(proApiUrl ? { BETA_PRO_API_URL: proApiUrl } : {}),
                ...(coinsUrl ? { BETA_COINS_URL: coinsUrl } : {}),
                ...(yieldsUrl ? { BETA_YIELDS_URL: yieldsUrl } : {}),
            },
            detached: false,
            shell: false,
        });

        currentTestProcess = testProcess;

        const onWsClose = () => {
            testProcess.kill('SIGTERM');
        };
        ws.on('close', onWsClose);

        let fullOutput = '';

        testProcess.stdout?.on('data', (data: Buffer) => {
            const output = data.toString();
            fullOutput += output;
            safeSend(ws, {
                type: 'api-test-output',
                content: output,
            });
        });

        testProcess.stderr?.on('data', (data: Buffer) => {
            const output = data.toString();
            fullOutput += output;
            safeSend(ws, {
                type: 'api-test-output',
                content: output,
            });
        });

        testProcess.on('close', (code: number | null) => {
            ws.off('close', onWsClose);
            currentTestProcess = null;

            const result = parseJestOutput(fullOutput, code === 0);

            safeSend(ws, {
                type: 'api-test-summary',
                data: result,
            });

            console.log(`[API Tests] Completed with exit code: ${code}`);
            console.log(`[API Tests] Results: ${result.tests.passed}/${result.tests.total} tests passed`);

            resolve(result);
        });

        testProcess.on('error', (err: Error) => {
            ws.off('close', onWsClose);
            currentTestProcess = null;
            console.error('[API Tests] Process error:', err);
            safeSend(ws, {
                type: 'api-test-error',
                content: err.message,
            });
            resolve(null);
        });
    });
}

function parseJestOutput(output: string, success: boolean): TestResult {
    const result: TestResult = {
        testSuites: { passed: 0, failed: 0, skipped: 0, todo: 0, total: 0 },
        tests: { passed: 0, failed: 0, skipped: 0, todo: 0, total: 0 },
        duration: '0s',
        success,
    };

    // biome-ignore lint/suspicious/noControlCharactersInRegex: needed to strip ANSI color codes from terminal output
    const cleanOutput = output.replace(/\x1B\[\d+m/g, '');

    const suitesLineMatch = cleanOutput.match(/Test Suites:\s*(.+)/);
    if (suitesLineMatch) {
        const matches = suitesLineMatch[1].matchAll(/(\d+)\s+(passed|failed|skipped|todo|total)/g);
        for (const m of matches) {
            const count = parseInt(m[1], 10);
            const key = m[2] as keyof typeof result.testSuites;
            result.testSuites[key] = count;
        }
    }

    const testsLineMatch = cleanOutput.match(/Tests:\s*(.+)/);
    if (testsLineMatch) {
        const matches = testsLineMatch[1].matchAll(/(\d+)\s+(passed|failed|skipped|todo|total)/g);
        for (const m of matches) {
            const count = parseInt(m[1], 10);
            const key = m[2] as keyof typeof result.tests;
            result.tests[key] = count;
        }
    }

    const timeMatch = cleanOutput.match(/Time:\s*([\d.]+)\s*s/);
    if (timeMatch) {
        result.duration = `${timeMatch[1]}s`;
    }

    return result;
}

export const apiTestFormChoices = {
    categories: apiTestCategories,
    testFilesByCategory: apiTestFiles,
    testNamesByFile: apiTestNames,
};
