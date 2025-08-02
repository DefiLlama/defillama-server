// Chart Time Period Generation

// This script analyzes fee collection patterns for protocols to automatically determine optimal chart default time periods (daily or weekly). It retrieves 6 months of fee data (`ANALYSIS_PERIOD_DAYS`: 180) from the `DIMENSIONS_DATA` table and uses two detection methods: **Primary concentration analysis** checks if 80% of weekly fees (`CONCENTRATION_THRESHOLD`: 80) are concentrated in 1-2 days, requiring 70% of weeks (`MIN_CONCENTRATION_CONSISTENCY`: 0.7) to show this pattern; **Fallback consistency analysis** calculates a baseline from the 20 lowest non-zero daily values (`BASELINE_SAMPLE_SIZE`: 20) and checks if weekly averages are 5x higher (`WEEKLY_THRESHOLD_MULTIPLIER`: 5) than baseline, with 70% consistency (`MIN_WEEKLY_CONSISTENCY`: 0.7) required. Protocols like Beradrome that collect fees on specific days of the week are automatically detected and marked for weekly defaults, while all others use daily defaults. The script outputs `chartTimePeriods.json` with all protocol recommendations and generates visual `temp_charts/` for debugging weekly protocols. Run via `npm run generate-chart-periods` or automatically through `npm run cron-metadata` for app metadata integration.

require('dotenv').config();
import { initializeTVLCacheDB, TABLES } from '../db';
import { Op } from 'sequelize';
import * as fs from 'fs';
import path from 'path';

interface ProtocolAnalysis {
  id: string;
  dailyDataPoints: number;
  weeklyAverage: number;
  lowValueDaysCount: number;
  nonZeroDaysCount: number;
  recommendedTimePeriod: 'day' | 'week';
  confidence: number;
}

const ANALYSIS_PERIOD_DAYS = 180; // 6 months
const BASELINE_SAMPLE_SIZE = 20; // Use average of 20 lowest values as baseline
const WEEKLY_THRESHOLD_MULTIPLIER = 5; // Weekly average must be 5x higher than baseline
const MIN_WEEKLY_CONSISTENCY = 0.7; // 70% of weeks must be significantly higher than baseline
// New concentration-based constants
const CONCENTRATION_THRESHOLD = 80; // 80% of weekly fees must be in 1-2 days
const MIN_CONCENTRATION_CONSISTENCY = 0.7; // 70% of weeks must show concentration pattern

function extractFeeValue(data: any): number {
  const possiblePaths = [
    data?.aggregated?.df?.value,  // New format
    data?.dailyFees,              // Legacy format
    data?.total24h,               // Alternative legacy format
  ];

  for (const value of possiblePaths) {
    if (value != null) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(numValue) ? 0 : numValue;
    }
  }

  return 0;
}

async function getLastSixMonthsFeeData(): Promise<any[]> {
  const sixMonthsAgo = Math.floor(Date.now() / 1000) - (ANALYSIS_PERIOD_DAYS * 24 * 60 * 60);

  const result = await TABLES.DIMENSIONS_DATA.findAll({
    where: {
      type: 'fees',
      timestamp: { [Op.gte]: sixMonthsAgo },
    },
    attributes: ['id', 'timestamp', 'data', 'timeS'],
    raw: true,
    order: [['id', 'ASC'], ['timestamp', 'ASC']]
  });

  return result;
}

function analyzeFeePattern(protocolData: any[]): ProtocolAnalysis {
  if (protocolData.length === 0) {
    return {
      id: 'unknown',
      dailyDataPoints: 0,
      weeklyAverage: 0,
      lowValueDaysCount: 0,
      nonZeroDaysCount: 0,
      recommendedTimePeriod: 'day',
      confidence: 0
    };
  }

  const id = protocolData[0].id;
  const dailyValues: number[] = [];

  // Extract daily fee values
  for (const record of protocolData) {
    try {
      const data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
      const value = extractFeeValue(data);
      dailyValues.push(value);
    } catch (error) {
      console.warn(`Error parsing data for protocol ${id}:`, error);
      dailyValues.push(0);
    }
  }

  const nonZeroDays = dailyValues.filter(v => v > 0);

  // Add timestamps for day-of-week analysis
  const dailyDataWithDates: { value: number; dayOfWeek: number; date: Date }[] = [];
  for (let i = 0; i < protocolData.length; i++) {
    const record = protocolData[i];
    const date = new Date(record.timestamp * 1000);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    dailyDataWithDates.push({ value: dailyValues[i], dayOfWeek, date });
  }

  // Calculate baseline from lowest non-zero values
  const nonZeroValues = dailyValues.filter(v => v > 0);
  const sortedNonZeroValues = [...nonZeroValues].sort((a, b) => a - b);
  const baselineSampleSize = Math.min(BASELINE_SAMPLE_SIZE, sortedNonZeroValues.length);
  const baselineValues = sortedNonZeroValues.slice(0, baselineSampleSize);
  const baselineAverage =
    baselineValues.reduce((a, b) => a + b, 0) / baselineSampleSize || 0;

  // Calculate weekly averages for fallback method
  const weeklyChunks: number[][] = [];
  for (let i = 0; i < dailyValues.length; i += 7) {
    const chunk = dailyValues.slice(i, i + 7);
    if (chunk.length === 7) weeklyChunks.push(chunk);
  }
  const weeklyAverages = weeklyChunks.map(chunk => chunk.reduce((a, b) => a + b, 0) / 7);
  const weeklyAvg = weeklyAverages.reduce((a, b) => a + b, 0) / weeklyAverages.length || 0;

  // Check for weekly fee concentration pattern
  const weeklyConcentrationPattern = analyzeWeeklyConcentrationPattern(dailyDataWithDates);

  let recommendedTimePeriod: 'day' | 'week' = 'day';
  let confidence = 0.9;

  // Method 1: Weekly concentration pattern (primary detection method)
  if (weeklyConcentrationPattern.hasPattern) {
    recommendedTimePeriod = 'week';
    confidence = weeklyConcentrationPattern.confidence;
  }
  // Method 2: Original weekly consistency check (fallback)
  else if (weeklyAverages.length >= 4 &&
    baselineAverage > 0 &&
    weeklyAvg > baselineAverage * WEEKLY_THRESHOLD_MULTIPLIER) {

    const significantWeeks = weeklyAverages.filter(weekAvg =>
      weekAvg > baselineAverage * WEEKLY_THRESHOLD_MULTIPLIER
    );
    const weeklyConsistencyRatio = significantWeeks.length / weeklyAverages.length;

    if (weeklyConsistencyRatio >= MIN_WEEKLY_CONSISTENCY) {
      recommendedTimePeriod = 'week';
      confidence = Math.min(0.8, weeklyConsistencyRatio + 0.1);
    }
  }

  return {
    id,
    dailyDataPoints: dailyValues.length,
    weeklyAverage: weeklyAvg,
    lowValueDaysCount: dailyValues.length - nonZeroDays.length,
    nonZeroDaysCount: nonZeroDays.length,
    recommendedTimePeriod,
    confidence
  };
}



function analyzeWeeklyConcentrationPattern(
  dailyDataWithDates: { value: number; dayOfWeek: number; date: Date }[]
): { hasPattern: boolean; confidence: number } {
  if (dailyDataWithDates.length < 28) { // Need at least 4 weeks of data
    return { hasPattern: false, confidence: 0 };
  }

  // Group data by week (starting Sunday)
  const weekGroups: {
    [weekKey: string]: { value: number; dayOfWeek: number; date: Date }[]
  } = {};

  for (const item of dailyDataWithDates) {
    // Get Sunday of the week for this date
    const date = new Date(item.date);
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const sundayDate = new Date(date);
    sundayDate.setDate(date.getDate() - dayOfWeek);
    const weekKey = sundayDate.toISOString().split('T')[0];

    if (!weekGroups[weekKey]) {
      weekGroups[weekKey] = [];
    }
    weekGroups[weekKey].push(item);
  }

  // Only analyze complete weeks (7 days)
  const completeWeeks = Object.values(weekGroups).filter(week => week.length === 7);

  if (completeWeeks.length < 4) {
    return { hasPattern: false, confidence: 0 };
  }

  // Analyze each week for fee concentration
  let concentratedWeeks = 0;
  const weekAnalysis: {
    weekTotal: number;
    topDayPercent: number;
    topTwoDaysPercent: number;
    isConcentrated: boolean
  }[] = [];

  for (const week of completeWeeks) {
    const weekTotal = week.reduce((sum, day) => sum + day.value, 0);

    if (weekTotal === 0) {
      weekAnalysis.push({
        weekTotal: 0,
        topDayPercent: 0,
        topTwoDaysPercent: 0,
        isConcentrated: false
      });
      continue;
    }

    // Sort days by value (highest first)
    const sortedDays = [...week].sort((a, b) => b.value - a.value);

    const topDayValue = sortedDays[0].value;
    const topTwoDaysValue = sortedDays[0].value + sortedDays[1].value;

    const topDayPercent = (topDayValue / weekTotal) * 100;
    const topTwoDaysPercent = (topTwoDaysValue / weekTotal) * 100;

    // Check concentration criteria:
    // - 1 peak day accounts for 80%+ of weekly fees, OR
    // - 2 peak days account for 80%+ of weekly fees
    const isConcentrated =
      topDayPercent >= CONCENTRATION_THRESHOLD ||
      topTwoDaysPercent >= CONCENTRATION_THRESHOLD;

    if (isConcentrated) {
      concentratedWeeks++;
    }

    weekAnalysis.push({
      weekTotal,
      topDayPercent,
      topTwoDaysPercent,
      isConcentrated
    });
  }

  const concentrationRatio = concentratedWeeks / completeWeeks.length;

  // Check if concentration pattern is consistent enough
  if (concentrationRatio >= MIN_CONCENTRATION_CONSISTENCY) {
    return {
      hasPattern: true,
      confidence: Math.min(0.95, concentrationRatio)
    };
  }

  return { hasPattern: false, confidence: concentrationRatio };
}

async function generateDebugCharts(
  weeklyProtocols: { protocolId: string; data: any[]; analysis: ProtocolAnalysis }[]
) {
  const tempDir = path.join(__dirname, 'temp_charts');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  for (const { protocolId, data, analysis } of weeklyProtocols) {
    await generateProtocolChart(protocolId, data, analysis, tempDir);
  }
}

async function generateProtocolChart(protocolId: string, data: any[], analysis: ProtocolAnalysis, tempDir: string) {
  // Extract daily values and dates
  const dailyData: { date: string; value: number }[] = [];

  for (const record of data) {
    try {
      const recordData = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
      const value = extractFeeValue(recordData);
      const date = new Date(record.timestamp * 1000).toISOString().split('T')[0];
      dailyData.push({ date, value });
    } catch (error) {
      console.warn(`Error processing record for ${protocolId}:`, error);
    }
  }

  // Sort by date
  dailyData.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate weekly aggregates
  const weeklyData: { week: string; value: number }[] = [];
  for (let i = 0; i < dailyData.length; i += 7) {
    const weekChunk = dailyData.slice(i, i + 7);
    if (weekChunk.length === 7) {
      const weekSum = weekChunk.reduce((sum, day) => sum + day.value, 0);
      const weekStart = weekChunk[0].date;
      weeklyData.push({ week: weekStart, value: weekSum });
    }
  }

  // Generate HTML chart
  const htmlContent = generateChartHTML(protocolId, dailyData, weeklyData, analysis);
  const filePath = path.join(tempDir, `${protocolId}_chart.html`);
  fs.writeFileSync(filePath, htmlContent);
}

function generateChartHTML(
  protocolId: string,
  dailyData: any[],
  weeklyData: any[],
  analysis: ProtocolAnalysis
): string {
  const dailyLabels = dailyData.map(d => d.date);
  const dailyValues = dailyData.map(d => d.value);
  const weeklyLabels = weeklyData.map(w => w.week);
  const weeklyValues = weeklyData.map(w => w.value);

  // Calculate statistics for display
  const totalFees = dailyValues.reduce((a, b) => a + b, 0);
  const maxDaily = Math.max(...dailyValues);
  const maxWeekly = Math.max(...weeklyValues);
  const avgDaily = totalFees / dailyValues.length;
  const avgWeekly = weeklyValues.reduce((a, b) => a + b, 0) / weeklyValues.length;

  return `<!DOCTYPE html>
<html>
<head>
    <title>Protocol ${protocolId} - Fee Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f8f9fa;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { margin: 0; font-size: 2.5em; font-weight: 300; }
        .content { padding: 30px; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stats-card { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #667eea;
        }
        .stats-card h3 { margin: 0 0 15px 0; color: #495057; font-size: 1.1em; }
        .stats-row { display: flex; justify-content: space-between; margin: 8px 0; }
        .stats-label { color: #6c757d; }
        .stats-value { font-weight: 600; color: #495057; }
        .recommendation {
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            font-weight: 600;
            font-size: 1.1em;
        }
        .weekly { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .daily { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .chart-container { 
            width: 100%; 
            height: 450px; 
            margin: 30px 0; 
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .chart-title {
            font-size: 1.3em;
            margin-bottom: 15px;
            color: #495057;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Protocol ${protocolId}</h1>
            <p>Fee Collection Pattern Analysis (Last 6 Months)</p>
        </div>
        
        <div class="content">
            <div class="recommendation ${analysis.recommendedTimePeriod}">
                📊 Recommended Chart Period: ${analysis.recommendedTimePeriod.toUpperCase()} 
                (${(analysis.confidence * 100).toFixed(1)}% confidence)
            </div>

            <div class="stats-grid">
                <div class="stats-card">
                    <h3>📈 Data Overview</h3>
                    <div class="stats-row">
                        <span class="stats-label">Analysis Period:</span>
                        <span class="stats-value">${analysis.dailyDataPoints} days</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-label">Active Days:</span>
                        <span class="stats-value">${analysis.nonZeroDaysCount}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-label">Total Fees:</span>
                        <span class="stats-value">$${totalFees.toLocaleString()}</span>
                    </div>
                </div>

                <div class="stats-card">
                    <h3>📊 Daily Statistics</h3>
                    <div class="stats-row">
                        <span class="stats-label">Average Daily:</span>
                        <span class="stats-value">$${avgDaily.toLocaleString()}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-label">Maximum Daily:</span>
                        <span class="stats-value">$${maxDaily.toLocaleString()}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-label">Activity Rate:</span>
                        <span class="stats-value">${((analysis.nonZeroDaysCount / analysis.dailyDataPoints) * 100).toFixed(1)}%</span>
                    </div>
                </div>

                <div class="stats-card">
                    <h3>📅 Weekly Statistics</h3>
                    <div class="stats-row">
                        <span class="stats-label">Average Weekly:</span>
                        <span class="stats-value">$${avgWeekly.toLocaleString()}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-label">Maximum Weekly:</span>
                        <span class="stats-value">$${maxWeekly.toLocaleString()}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stats-label">Pattern Type:</span>
                        <span class="stats-value">${analysis.recommendedTimePeriod === 'week' ? 'Concentrated' : 'Distributed'}</span>
                    </div>
                </div>
            </div>

            <div class="chart-container">
                <div class="chart-title">📈 Daily Fee Collection</div>
                <canvas id="dailyChart"></canvas>
            </div>

            <div class="chart-container">
                <div class="chart-title">📊 Weekly Fee Aggregation</div>
                <canvas id="weeklyChart"></canvas>
            </div>
        </div>
    </div>

    <script>
        // Daily Chart with improved styling
        new Chart(document.getElementById('dailyChart'), {
            type: 'line',
            data: {
                labels: ${JSON.stringify(dailyLabels)},
                datasets: [{
                    label: 'Daily Fees',
                    data: ${JSON.stringify(dailyValues)},
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { maxTicksLimit: 20 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        // Weekly Chart with improved styling
        new Chart(document.getElementById('weeklyChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(weeklyLabels)},
                datasets: [{
                    label: 'Weekly Fees',
                    data: ${JSON.stringify(weeklyValues)},
                    backgroundColor: 'rgba(118, 75, 162, 0.8)',
                    borderColor: '#764ba2',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { maxTicksLimit: 15 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    </script>
</body>
</html>`;
}

async function generateChartTimePeriods(debug: boolean = false): Promise<{ [protocolId: string]: string }> {
  const feeData = await getLastSixMonthsFeeData();

  if (feeData.length === 0) {
    return {};
  }

  const protocolGroups = new Map<string, any[]>();
  for (const record of feeData) {
    if (!protocolGroups.has(record.id)) {
      protocolGroups.set(record.id, []);
    }
    protocolGroups.get(record.id)!.push(record);
  }

  const results: { [protocolId: string]: string } = {};
  const weeklyProtocols: { protocolId: string; data: any[]; analysis: ProtocolAnalysis }[] = [];
  let weeklyCount = 0;

  for (const [protocolId, data] of protocolGroups.entries()) {
    const analysis = analyzeFeePattern(data);

    if (analysis.confidence > 0.6 && analysis.recommendedTimePeriod === 'week') {
      results[protocolId] = 'week';
      weeklyCount++;
      weeklyProtocols.push({ protocolId, data, analysis });
    } else {
      results[protocolId] = 'day';
    }
  }

  // Generate visual debug charts for weekly protocols (only in debug mode)
  if (debug && weeklyProtocols.length > 0) {
    await generateDebugCharts(weeklyProtocols);
  }

  return results;
}

async function saveChartTimePeriods(timePeriods: { [protocolId: string]: string }) {
  const outputPath = path.join(__dirname, 'chartTimePeriods.json');
  fs.writeFileSync(outputPath, JSON.stringify(timePeriods, null, 2));
  console.log(`Chart time periods saved to: ${outputPath}`);
  return outputPath;
}

async function run() {
  try {
    await initializeTVLCacheDB();
    console.log('Database initialized successfully');

    // Enable debug mode when running directly from command line
    const debugMode = process.env.LLAMA_DEBUG_LEVEL2 === 'true' || process.env.LLAMA_DEBUG_LEVEL2 === '1';
    console.log(`Debug mode: ${debugMode ? 'enabled' : 'disabled'}`);

    const timePeriods = await generateChartTimePeriods(debugMode);

    const outputPath = await saveChartTimePeriods(timePeriods);
    console.log('\n✅ Analysis complete!');
    console.log(`📊 Results saved to: ${outputPath}`);
    console.log(`🔧 Next step: Update appMetadata.ts to include these time periods`);

  } catch (error) {
    console.error('Error during analysis:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  run().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }).then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  });
}

export { generateChartTimePeriods, saveChartTimePeriods };