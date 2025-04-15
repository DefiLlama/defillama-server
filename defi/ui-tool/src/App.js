import React, { useState, useEffect, useRef } from 'react';
import {
  ConfigProvider, theme, Layout, Form, Select, DatePicker, InputNumber, Switch,
  Button, Typography, Divider,
  Splitter,
  Tabs
} from 'antd';
import { PlayCircleOutlined, ClearOutlined } from '@ant-design/icons';

import './App.css';

const { Content, } = Layout;
const { Text } = Typography;
const { Option } = Select;
const { defaultAlgorithm, darkAlgorithm } = theme;

const App = () => {
  const [form] = Form.useForm();
  const [output, setOutput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const outputRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [protocols, setProtocols] = useState([]);
  const [adapterTypes, setAdapterTypes] = useState([]);
  const [formOptions, setFormOptions] = useState({
    dimensionFormChoices: {
      adapterTypes: ['fees'],
      adapterTypeChoices: { fees: [] },
    }
  });

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'init':
          console.log('WebSocket initialized', data);
          setFormOptions(data.data);
          setAdapterTypes(data.data.dimensionFormChoices.adapterTypes);
          setProtocols(data.data.dimensionFormChoices.adapterTypeChoices['fees'] ?? [])
          break;
        case 'output':
        case 'error':
          console.log('WebSocket output', data);
          setOutput((prev) => prev + data.content);
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
          break;
      }

      /* if (data.type === 'output') {
        setOutput((prev) => prev + data.content);
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      } else if (data.type === 'protocols') {
        setProtocols(data.protocols);
      } else if (data.type === 'done') {
        setLoading(false);
      } */
    };

    return () => {
      ws.close();
    };
  }, []);

  // Handle adapter type change
  const handleAdapterTypeChange = (value) => {
    setProtocols(formOptions.dimensionFormChoices.adapterTypeChoices[value]);
  };

  // Handle form submission
  const handleSubmit = (values) => {
    setLoading(true);
    setOutput('');

    const payload = {
      type: 'runCommand',
      adapterType: values.adapterType,
      protocol: values.protocol,
      dateFrom: values.dateFrom ? Math.floor(values.dateFrom.valueOf() / 1000) : undefined,
      dateTo: values.dateTo ? Math.floor(values.dateTo.valueOf() / 1000) : undefined,
      onlyMissing: values.onlyMissing || false,
      parallelCount: values.parallelCount || 3,
      dryRun: values.dryRun || false
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const clearOutput = () => {
    setOutput('');
  };

  return (
    <ConfigProvider theme={{
      algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
    }}>
      <Layout className='layout'>
        <Button
          type="text"
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{ display: 'flex', alignSelf: 'flex-end', maxWidth: 100, margin: 10 }}
        > {isDarkMode ? 'Light Mode' : 'Dark Mode'}  </Button>
        <Content>
          <Splitter>
            <Splitter.Panel defaultSize="30%" min="20%" max="90%" className='content'>
              <Tabs
                defaultActiveKey="1"
                type='card'
                items={[
                  {
                    label: 'Dimensions Refill',
                    key: '1',
                    children: <div>{getDimensionsRefillForm()}</div>,
                  },
                ]}
              />
            </Splitter.Panel>
            <Splitter.Panel>
              <Divider>Output</Divider>
              <div
                ref={outputRef}
                className="output-container"
              >
                <pre>{output || "No output yet. Run a command to see results here."}</pre>
              </div>
            </Splitter.Panel>
          </Splitter>
        </Content>
      </Layout>
    </ConfigProvider >
  );

  function getDimensionsRefillForm() {
    return (<Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        adapterType: adapterTypes[0],
        parallelCount: 3,
        onlyMissing: false,
        dryRun: false
      }}
      style={{ 'max-width': '400px' }}
    >
      <Form.Item
        label="Adapter Type"
        name="adapterType"
        rules={[{ required: true, message: 'Please select adapter type' }]}
      >
        <Select placeholder="Select adapter type" onChange={handleAdapterTypeChange}>
          {adapterTypes.map(type => (
            <Option key={type} value={type}>{type}</Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label="Protocol"
        name="protocol"
        rules={[{ required: true, message: 'Please select protocol' }]}
      >
        <Select
          showSearch
          placeholder="Select protocol"
          optionFilterProp="children"
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {protocols.map(protocol => (
            <Option key={protocol} value={protocol}>{protocol}</Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label="Only Missing"
        name="onlyMissing"
        valuePropName="checked"
      >
        <Switch checkedChildren="Yes" unCheckedChildren="No" />
      </Form.Item>

      <Form.Item
        label="Date From"
        name="dateFrom"
        dependencies={["onlyMissing"]}
        disabled={form.getFieldValue('onlyMissing')}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (getFieldValue('onlyMissing') || value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Please select start date'));
            },
          }),
        ]}
      >
        <DatePicker />
      </Form.Item>

      <Form.Item
        label="Date To"
        name="dateTo"
        dependencies={["onlyMissing"]}
        disabled={form.getFieldValue('onlyMissing')}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (getFieldValue('onlyMissing') || value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Please select end date'));
            },
          }),
        ]}
      >
        <DatePicker />
      </Form.Item>

      <Form.Item
        label="Parallel Count"
        name="parallelCount"
        rules={[{ required: true, message: 'Please enter parallel count' }]}
        defaultValue={1}
      >
        <InputNumber min={1} max={100} />
      </Form.Item>

      <Form.Item
        label="Dry Run"
        name="dryRun"
        valuePropName="checked"
      >
        <Switch checkedChildren="Yes" unCheckedChildren="No" />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          icon={<PlayCircleOutlined />}
          // loading={loading}
          disabled={!isConnected}
        >
          Run
        </Button>
        <Button
          style={{ marginLeft: 10 }}
          icon={<ClearOutlined />}
          onClick={clearOutput}
        >
          Clear Output
        </Button>
        {!isConnected && <Text type="danger" style={{ marginLeft: 10 }}>WebSocket disconnected</Text>}
      </Form.Item>
    </Form>)
  }
};

export default App;