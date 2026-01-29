import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const apiTestsDir = path.resolve(__dirname, '../../api-tests');
const apiTestsSrcDir = path.join(apiTestsDir, 'src');

function extractTestNames(filePath: string): string[] {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const testNameRegex = /(?:it|test)(?:\.(?:only|skip|todo|concurrent))?\s*\(\s*['"`]([^'"`]+)['"`]/g;
        const testNames: string[] = [];
        let match;
        while ((match = testNameRegex.exec(content)) !== null) {
            testNames.push(match[1]);
        }
        return [...new Set(testNames)].sort((a, b) => a.localeCompare(b));
    } catch {
        return [];
    }
}

function loadTestCategories(): {
    categories: string[];
    testFilesByCategory: Record<string, string[]>;
    testNamesByFile: Record<string, string[]>;
} {
    const categories: string[] = ['all'];
    const testFilesByCategory: Record<string, string[]> = {};
    const testNamesByFile: Record<string, string[]> = {};

    try {
        const dirs = fs.readdirSync(apiTestsSrcDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .sort((a, b) => a.name.localeCompare(b.name));

        for (const dir of dirs) {
            const categoryName = dir.name;
            const categoryPath = path.join(apiTestsSrcDir, categoryName);

            const files = fs.readdirSync(categoryPath)
                .filter(file => file.endsWith('.test.ts'))
                .sort((a, b) => a.localeCompare(b));

            if (files.length === 0) continue;

            categories.push(categoryName);
            testFilesByCategory[categoryName] = files;

            files.forEach(file => {
                const names = extractTestNames(path.join(categoryPath, file));
                if (names.length > 0) {
                    testNamesByFile[`${categoryName}/${file}`] = names;
                }
            });
        }
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
}

export interface TestResult {
    testSuites: { passed: number; failed: number; total: number };
    tests: { passed: number; failed: number; total: number };
    duration: string;
    success: boolean;
}

let currentTestProcess: ChildProcess | null = null;

export function stopApiTests(): boolean {
    if (currentTestProcess && currentTestProcess.pid) {
        try {
            process.kill(-currentTestProcess.pid, 'SIGTERM');
        } catch (e) {
            currentTestProcess.kill('SIGTERM');
        }
        currentTestProcess = null;
        return true;
    }
    return false;
}

export async function runApiTests(
    ws: any,
    options: ApiTestOptions
): Promise<TestResult | null> {
    const { category = 'all', testFile, testName, verbose = true } = options;

    const args: string[] = ['jest'];

    if (category !== 'all') {
        if (testFile) {
            args.push(`src/${category}/${testFile}`);
        } else {
            args.push(`src/${category}/`);
        }
    }

    if (testName) {
        args.push('-t', testName);
    }
    if (verbose) {
        args.push('--verbose');
    }
    args.push('--passWithNoTests');

    console.log(`[API Tests] Running: npx jest ${args.slice(1).join(' ')}`);
    console.log(`[API Tests] Category: ${category}${testFile ? `, File: ${testFile}` : ''}`);

    return new Promise((resolve) => {
        const npxPath = 'npx';

        const testProcess = spawn(npxPath, args, {
            cwd: apiTestsDir,
            env: {
                ...process.env,
                FORCE_COLOR: '1',
            },
            detached: true,
            shell: true,
        });

        currentTestProcess = testProcess;

        let fullOutput = '';

        testProcess.stdout?.on('data', (data: Buffer) => {
            const output = data.toString();
            fullOutput += output;
            ws.send(JSON.stringify({
                type: 'api-test-output',
                content: output,
            }));
        });

        testProcess.stderr?.on('data', (data: Buffer) => {
            const output = data.toString();
            fullOutput += output;
            ws.send(JSON.stringify({
                type: 'api-test-output',
                content: output,
            }));
        });

        testProcess.on('close', (code: number | null) => {
            currentTestProcess = null;

            const result = parseJestOutput(fullOutput, code === 0);

            ws.send(JSON.stringify({
                type: 'api-test-summary',
                data: result,
            }));

            console.log(`[API Tests] Completed with exit code: ${code}`);
            console.log(`[API Tests] Results: ${result.tests.passed}/${result.tests.total} tests passed`);

            resolve(result);
        });

        testProcess.on('error', (err: Error) => {
            currentTestProcess = null;
            console.error('[API Tests] Process error:', err);
            ws.send(JSON.stringify({
                type: 'api-test-error',
                content: err.message,
            }));
            resolve(null);
        });
    });
}

function parseJestOutput(output: string, success: boolean): TestResult {
    const result: TestResult = {
        testSuites: { passed: 0, failed: 0, total: 0 },
        tests: { passed: 0, failed: 0, total: 0 },
        duration: '0s',
        success,
    };

    const cleanOutput = output.replace(/\x1B\[\d+m/g, '');

    const suitesMatch = cleanOutput.match(/Test Suites:\s*(?:(\d+)\s*failed,\s*)?(?:(\d+)\s*passed,\s*)?(\d+)\s*total/);
    if (suitesMatch) {
        result.testSuites.failed = parseInt(suitesMatch[1] || '0', 10);
        result.testSuites.passed = parseInt(suitesMatch[2] || '0', 10);
        result.testSuites.total = parseInt(suitesMatch[3] || '0', 10);
    }

    const testsMatch = cleanOutput.match(/Tests:\s*(?:(\d+)\s*failed,\s*)?(?:(\d+)\s*passed,\s*)?(\d+)\s*total/);
    if (testsMatch) {
        result.tests.failed = parseInt(testsMatch[1] || '0', 10);
        result.tests.passed = parseInt(testsMatch[2] || '0', 10);
        result.tests.total = parseInt(testsMatch[3] || '0', 10);
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
