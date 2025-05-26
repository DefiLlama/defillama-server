import React, { useState, useEffect, useRef } from 'react';
import {
  ConfigProvider, theme, Layout, Form, Select, DatePicker, InputNumber, Switch,
  Button, Typography, Divider,
  Splitter,
  Tabs,
  Table,
} from 'antd';
import { PlayCircleOutlined, ClearOutlined, MoonOutlined, SaveOutlined, LineChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import './App.css';
import { Line } from '@ant-design/plots';

const { Content, } = Layout;
const { Text } = Typography;
const { Option } = Select;
const { defaultAlgorithm, darkAlgorithm } = theme;

const App = () => {

  const [output, setOutput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const outputRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [formOptions, setFormOptions] = useState({
    dimensionFormChoices: {
      adapterTypes: ['fees'],
      adapterTypeChoices: { fees: [] },
    }
  });


  const [dimensionRefillForm] = Form.useForm();
  const [adapterTypes, setAdapterTypes] = useState([]);
  const [dimensionRefillProtocols, setDimensionRefillProtocols] = useState([]);
  const [dimRefillWaitingRecords, setDimRefillWaitingRecords] = useState([]);
  const [waitingRecordsShowChainColumns, setWaitingRecordsShowChainColumns] = useState(false);
  const [waitingRecordsDeletableIds, setWaitingRecordsDeletableIds] = useState([]);
  const [waitingRecordsShowChart, setWaitingRecordsShowChart] = useState(true);
  const [waitingRecordsSelectedChartColumn, setWaitingRecordsSelectedChartColumn] = useState('');

  function addWebSocketConnection() {
    const ws = new WebSocket('ws://localhost:8080');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
      setTimeout(addWebSocketConnection, 1000); // Reconnect after 1 second
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'init':
          console.log('WebSocket initialized');
          setFormOptions(data.data);
          setAdapterTypes(data.data.dimensionFormChoices.adapterTypes);
          break;
        case 'output':
        case 'error':
          if (data.type === 'error') data.content = `Error: ${data.content}`;
          setOutput((prev) => prev + '\n' + data.content);
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
          break;
        case 'waiting-records':
          setDimRefillWaitingRecords(data.data);
          break;
        default:
          console.log('Unknown message type', data);
          break;
      }
    };

    return () => {
      ws.close();
    };

  }

  // WebSocket connection
  useEffect(addWebSocketConnection, []);

  // Key for localStorage
  const DIMENSIONS_FORM_STORAGE_KEY = 'dimensionRefillFormValues';

  // Load form values from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DIMENSIONS_FORM_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Loaded saved form values:', parsed);
        parsed.dateRange  = parsed.dateRange.map(dayjs)
        dimensionRefillForm.setFieldsValue(parsed);
        // If adapterType exists, update protocols
        if (parsed.adapterType) {
          setDimensionRefillProtocols(formOptions.dimensionFormChoices.adapterTypeChoices[parsed.adapterType] || []);
        }
      } catch (e) {
        console.error('Failed to parse saved form values:', e);
        // Ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOptions]);

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
          shape='round'
          icon={< MoonOutlined />}
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
              {getWaitingRecordsTable()}

              {output && (<Divider>Console Output</Divider>)}
              <div
                ref={outputRef}
                className="output-container"
              >
                <pre>{output || ""}</pre>
              </div>
            </Splitter.Panel>
          </Splitter>
        </Content>
      </Layout>
    </ConfigProvider >
  );

  function getDimensionsRefillForm() {


    // Handle adapter type change
    const handleAdapterTypeChange = (value) => {
      setDimensionRefillProtocols(formOptions.dimensionFormChoices.adapterTypeChoices[value]);
    };

    // Handle form submission
    const handleSubmit = (values) => {
      setOutput('');
      console.log('Form values:', values);

      const payload = {
        type: 'dimensions-refill-runCommand',
        data: {
          adapterType: values.adapterType,
          protocol: values.protocol,
          dateFrom: Math.floor(values.dateRange[0].valueOf() / 1000),
          dateTo: Math.floor(values.dateRange[1].valueOf() / 1000),
          onlyMissing: values.onlyMissing || false,
          parallelCount: values.parallelCount,
          // dryRun: values.dryRun || false,
          // checkBeforeInsert: values.checkBeforeInsert || false,
          dryRun: false,
          checkBeforeInsert: true,
        }
      };

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    };


    // Save form values to localStorage on change
    const handleFormChange = (_, allValues) => {
      localStorage.setItem(DIMENSIONS_FORM_STORAGE_KEY, JSON.stringify(allValues));
    };

    return (
      <Form
        form={dimensionRefillForm}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleFormChange}
        initialValues={{
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
            {dimensionRefillProtocols.map(protocol => (
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
          label="Date Range"
          name="dateRange"
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (getFieldValue('onlyMissing') || (value && value.length === 2)) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Please select a valid date range'));
              },
            }),
          ]}
        >
          <DatePicker.RangePicker />
        </Form.Item>

        <Form.Item
          label="Parallel Count"
          name="parallelCount"
          rules={[{ required: true, message: 'Please enter parallel count' }]}
        >
          <InputNumber min={1} max={100} />
        </Form.Item>

        {/*       <Form.Item
        label="Dry Run"
        name="dryRun"
        valuePropName="checked"
      >
        <Switch checkedChildren="Yes" unCheckedChildren="No" />
      </Form.Item>

      <Form.Item
        label="Check before inserting data"
        name="checkBeforeInsert"
        valuePropName="checked"
      >
        <Switch checkedChildren="Yes" unCheckedChildren="No" />
      </Form.Item> */}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlayCircleOutlined />}
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
      </Form>
    )
  }

  function printChartData(data, columnField) {
    if (!columnField) return null;
    data = [...data]
    data.sort((a, b) => new Date(a.timeS) - new Date(b.timeS))
    data = data.filter(i => i.hasOwnProperty(columnField))
    const config = {
      data,
      xField: (d) => new Date(d.timeS),
      yField: columnField,
      colorField: 'protocolName',
      height: 300,
      connectNulls: { connect: false },
    }
    return <Line {...config} />
  }

  function getWaitingRecordsTable() {
    if (!dimRefillWaitingRecords?.length) return null;

    const colSet = new Set(['id', 'adapterType'])
    const stringColSet = new Set(['id', 'adapterType', 'protocolName', 'timeS'])
    const columns = []
    const chartColumnsSet = new Set([])
    dimRefillWaitingRecords.forEach(record => {
      Object.keys(record).forEach(key => {
        if (colSet.has(key)) return;
        if (key.startsWith('_')) {
          if (key.startsWith('_d') && key.lastIndexOf('_') === 0) chartColumnsSet.add(key);
          return;
        }
        if (!waitingRecordsShowChainColumns && key.includes('_')) return;
        const column = { title: key, dataIndex: key, key, }
        if (stringColSet.has(key))
          column.sorter = (a, b) => a[key].localeCompare(b[key]);
        else
          column.sorter = (a, b) => a['_' + key] - b['_' + key];
        columns.push(column);
        colSet.add(key);
      });
    });
    const chartColumns = Array.from(chartColumnsSet)
    let selectChartElement = null;
    let chartColumnSelected = waitingRecordsSelectedChartColumn ? waitingRecordsSelectedChartColumn : chartColumns[0];

    if (chartColumns.length > 1 && waitingRecordsShowChart) {
      selectChartElement = <Select
        defaultValue={waitingRecordsSelectedChartColumn ? waitingRecordsSelectedChartColumn : chartColumnSelected}
        style={{ width: 200 }}
        onChange={setWaitingRecordsSelectedChartColumn}
      >
        {chartColumns.map((column) => (
          <Option key={column} value={column}>{column}</Option>
        ))}
      </Select>
    }

    return (
      <div>
        <div style={{ marginBottom: 10 }}>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '30px' }}>
            <Button type="primary" icon={<SaveOutlined />}
              onClick={() => {
                const payload = {
                  type: 'dimensions-refill-save-all',
                  data: [],
                };

                wsRef.current.send(JSON.stringify(payload));
                setWaitingRecordsDeletableIds([]);
              }}

            > Store everything in DB </Button>




            <Button
              type="default"
              icon={<ClearOutlined />}
              disabled={waitingRecordsDeletableIds.length === 0}
              danger
              onClick={() => {
                if (waitingRecordsDeletableIds.length === 0) {
                  return;
                }
                const payload = {
                  type: 'dimensions-refill-deleteRecords',
                  data: waitingRecordsDeletableIds,
                };

                wsRef.current.send(JSON.stringify(payload));
                setWaitingRecordsDeletableIds([]);
              }}
            >
              Delete Selected
            </Button>


            <Button
              type="default"
              icon={< LineChartOutlined />}
              onClick={() => setWaitingRecordsShowChart(!waitingRecordsShowChart)}
            >
              {waitingRecordsShowChart ? 'Hide Chart' : 'Show Chart'}
            </Button>

            {selectChartElement}


            <Switch
              checked={waitingRecordsShowChainColumns}
              onChange={(checked) => setWaitingRecordsShowChainColumns(checked)}
              unCheckedChildren="Show chain info"
              checkedChildren="Hide chain info"
            />
          </div>
        </div>

        {waitingRecordsShowChart && printChartData(dimRefillWaitingRecords, chartColumnSelected)}

        <Table
          columns={columns}
          dataSource={dimRefillWaitingRecords}
          pagination={{ pageSize: 5000 }}
          rowKey={(record) => record.id}
          rowSelection={{
            type: 'checkbox',
            onChange: (selectedRowKeys) => {
              setWaitingRecordsDeletableIds(selectedRowKeys);
            },
          }}
        />
      </div >
    );
  }
};

export default App;