import { Form, Select, Switch, Button, Flex, AutoComplete, Collapse, Input } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

const Option = Select.Option as any;

// Types
interface ApiTestFormProps {
    wsRef: { current: WebSocket | null };
    isConnected: boolean;
    formOptions: {
        apiTestFormChoices?: {
            categories?: string[];
            testFilesByCategory?: Record<string, string[]>;
            testNamesByFile?: Record<string, string[]>;
        };
    };
    onOutputChange: (output: string) => void;
    apiTestRunning: boolean;
    setApiTestRunning: (running: boolean) => void;
}

// Parse ANSI codes to HTML for colored terminal output
export const escapeHtml = (unsafe: string): string => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export const parseAnsiToHtml = (text: string): string => {
    if (!text) return '';

    // First escape HTML to prevent XSS
    const safeText = escapeHtml(text);

    // ANSI color code mapping
    const colorMap: Record<string, string> = {
        '30': '#000', '31': '#e74c3c', '32': '#2ecc71', '33': '#f39c12',
        '34': '#3498db', '35': '#9b59b6', '36': '#1abc9c', '37': '#ecf0f1',
        '90': '#7f8c8d', '91': '#ff6b6b', '92': '#5dfc5d', '93': '#ffeb3b',
        '94': '#64b5f6', '95': '#ce93d8', '96': '#4dd0e1', '97': '#ffffff',
    };

    let result = safeText;

    // Replace color codes: \x1B[32m -> <span style="color: green">
    result = result.replace(/\x1B\[(\d+)m/g, (_match: string, code: string) => {
        if (code === '0' || code === '22' || code === '39') return '</span>';
        if (code === '1') return '<span style="font-weight: bold">';
        if (code === '2') return '';  // Dim text - skip opacity for readability
        if (code === '7') return '<span style="background: `#333`; padding: 2px 4px">';
        if (code === '27') return '</span>';
        if (colorMap[code]) return `<span style="color: ${colorMap[code]}">`;
        return '';
    });

    // Clean up any unclosed spans at the end
    const openSpans = (result.match(/<span/g) || []).length;
    const closeSpans = (result.match(/<\/span>/g) || []).length;
    for (let i = 0; i < openSpans - closeSpans; i++) {
        result += '</span>';
    }

    return result;
};

/**
 * API Test Form Component
 */
export function ApiTestForm({
    wsRef,
    isConnected,
    formOptions,
    onOutputChange,
    apiTestRunning,
    setApiTestRunning,
}: ApiTestFormProps) {
    const [apiTestForm] = Form.useForm();
    const apiTestSelectedCategory = Form.useWatch('category', apiTestForm) as string | undefined;
    const apiTestSelectedFile = Form.useWatch('testFile', apiTestForm) as string | undefined;

    const handleSubmit = (values: { category?: string; testFile?: string; testName?: string; verbose?: boolean, baseApiUrl?: string; proApiUrl?: string; coinsUrl?: string; yieldsUrl?: string }) => {
        // Clear previous output
        onOutputChange('');
        setApiTestRunning(true);

        const payload = {
            type: 'api-test-runCommand',
            data: {
                category: values.category || 'all',
                testFile: values.testFile === 'all' ? undefined : values.testFile,
                testName: values.testName === 'all' ? undefined : values.testName,
                verbose: values.verbose !== false,
                baseApiUrl: values.baseApiUrl,
                proApiUrl: values.proApiUrl,
                coinsUrl: values.coinsUrl,
                yieldsUrl: values.yieldsUrl,
            }
        };

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
        }
    };

    const handleStop = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'api-test-stop' }));
        }
        setApiTestRunning(false);
    };

    // Get test files for selected category
    const testFiles = apiTestSelectedCategory && apiTestSelectedCategory !== 'all'
        ? formOptions.apiTestFormChoices?.testFilesByCategory?.[apiTestSelectedCategory] || []
        : [];

    // Get test names for selected file
    const fileKey = apiTestSelectedCategory && apiTestSelectedFile && apiTestSelectedFile !== 'all'
        ? `${apiTestSelectedCategory}/${apiTestSelectedFile}`
        : '';
    const testNames = fileKey
        ? formOptions.apiTestFormChoices?.testNamesByFile?.[fileKey] || []
        : [];

    return (
        <Form
            form={apiTestForm}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
                category: 'all',
                verbose: true,
                baseApiUrl: 'https://api.llama.fi',
                proApiUrl: 'https://pro-api.llama.fi',
                coinsUrl: 'https://coins.llama.fi',
                yieldsUrl: 'https://yields.llama.fi',
            }}
            style={{ maxWidth: '400px' }}
        >
            <Form.Item
                label="Test Category"
                name="category"
            >
                <Select
                    placeholder="Select category"
                    onChange={() => {
                        apiTestForm.setFieldValue('testFile', undefined);
                        apiTestForm.setFieldValue('testName', undefined);
                    }}
                >
                    {(formOptions.apiTestFormChoices?.categories || []).map((cat: string) => (
                        <Option key={cat} value={cat}>{cat}</Option>
                    ))}
                </Select>
            </Form.Item>

            {testFiles.length > 0 && (
                <Form.Item
                    label="Test File"
                    name="testFile"
                >
                    <Select
                        placeholder="All files in category"
                        allowClear
                        onChange={() => apiTestForm.setFieldValue('testName', undefined)}
                    >
                        <Option key="all" value="all">All files</Option>
                        {testFiles.map((file: string) => (
                            <Option key={file} value={file}>{file}</Option>
                        ))}
                    </Select>
                </Form.Item>
            )}

            {apiTestSelectedFile && apiTestSelectedFile !== 'all' && (
                <Form.Item
                    label="Test Name"
                    name="testName"
                    tooltip="Filter to run a specific test (uses Jest's -t flag)"
                >
                    <AutoComplete
                        placeholder="Select or type test name"
                        allowClear
                        options={[
                            { value: 'all', label: 'All tests' },
                            ...testNames.map((name: string) => ({ value: name, label: name }))
                        ]}
                        filterOption={(inputValue: string, option: any) =>
                            option!.value?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                        }
                    />
                </Form.Item>
            )}

            <Form.Item
                label="Verbose Output"
                name="verbose"
                valuePropName="checked"
            >
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>

            <Collapse
                ghost
                items={[
                    {
                        key: '1',
                        label: 'Base URLs',
                        children: (
                            <Flex vertical gap={10}>
                                <Form.Item label="API Base URL" name="baseApiUrl" style={{ marginBottom: 0 }}>
                                    <Input placeholder="https://api.llama.fi" />
                                </Form.Item>
                                <Form.Item label="Pro API Base URL" name="proApiUrl" style={{ marginBottom: 0 }}>
                                    <Input placeholder="https://pro-api.llama.fi" />
                                </Form.Item>
                                <Form.Item label="Coins API Base URL" name="coinsUrl" style={{ marginBottom: 0 }}>
                                    <Input placeholder="https://coins.llama.fi" />
                                </Form.Item>
                                <Form.Item label="Yields API Base URL" name="yieldsUrl" style={{ marginBottom: 0 }}>
                                    <Input placeholder="https://yields.llama.fi" />
                                </Form.Item>
                            </Flex>
                        ),
                    },
                ]}
            />

            <Form.Item>
                <Flex gap={10}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        icon={<PlayCircleOutlined />}
                        disabled={!isConnected || apiTestRunning}
                        loading={apiTestRunning}
                    >
                        {apiTestRunning ? 'Running...' : 'Run Tests'}
                    </Button>
                    {apiTestRunning && (
                        <Button
                            danger
                            onClick={handleStop}
                        >
                            Stop
                        </Button>
                    )}
                </Flex>
            </Form.Item>
        </Form>
    );
}
