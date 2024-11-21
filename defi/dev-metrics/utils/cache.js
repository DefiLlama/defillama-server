
const path = require('path')
const fs = require('fs');
const rimraf = require('rimraf');
const zlib = require('zlib');
const { v4: uuidv4 } = require('uuid');
const { turnRawLogToMinimalLog } = require('.');
const sdk = require('@defillama/sdk')

const DATA_ROOT = path.join(__dirname, '../app-data')
const TEMP_ROOT = path.join(DATA_ROOT, 'temp')

function createSubPath(folderPath) {
  folderPath = folderPath.replace(DATA_ROOT, '')
  try {
    fs.mkdirSync(path.join(DATA_ROOT, folderPath), { recursive: true });
  } catch (error) {
    // sdk.log('Error creating folder path:', error)
  }
}

function getTempFolder() {
  const tempDirName = uuidv4();
  const tempDirPath = path.join(DATA_ROOT, 'temp', tempDirName)
  createSubPath(tempDirPath)
  return tempDirPath
}

function clearTempFolders() {
  return rimraf.rimrafSync(TEMP_ROOT)
}

function deleteFolder(folderName) {
  try {
    rimraf.rimrafSync(folderName)
  } catch (e) {
    console.log('Error deleting folder', e)
  }
  return rimraf.rimrafSync(TEMP_ROOT)
}

function writeJSON(filePath, fileData, { compressed = true } = {}) {
  let jsonStr = JSON.stringify(fileData);
  if (compressed) jsonStr = zlib.deflateSync(jsonStr)
  filePath = filePath.replace(DATA_ROOT, '')
  if (filePath.startsWith('/')) filePath = filePath.slice(1)
  if (!filePath.endsWith('.json')) filePath += '.json'
  let folderPath = filePath.split('/')
  folderPath.pop()
  createSubPath(folderPath.join('/'))
  fs.writeFileSync(path.join(DATA_ROOT, filePath), jsonStr);
}

function readJSON(filePath, { compressed = true } = {}) {
  try {
    const encoding = compressed ? undefined: 'utf8'
    let fileData = fs.readFileSync(filePath, encoding)
    if (compressed) fileData = zlib.inflateSync(fileData).toString()
    return JSON.parse(fileData)
  } catch (error) {
    // sdk.log(error, filePath)
    return {}
  }
}

function getOrgFile(orgName) {
  return path.join(DATA_ROOT, 'orgCache', orgName, 'index.json')
}

function getRepoLogFileName(orgName, repoName, isRaw) {
  const file = isRaw ? 'rawLogs.json' : 'logs.json'
  return path.join(DATA_ROOT, 'orgCache', orgName, 'logs', repoName, file)
}

function getRepoLogFile(orgName, repoName, isRaw = true) {
  const filePath = getRepoLogFileName(orgName, repoName, isRaw)
  return readJSON(filePath)
}

function setRepoLogFile(orgName, repoName, logData) {
  const filePath = getRepoLogFileName(orgName, repoName, true)
  writeJSON(filePath, logData)
  return; // no more saving minimal log
  const minimalLogFile = getRepoLogFileName(orgName, repoName, false)
  const { logs = [], ...minimalLogs } = logData
  minimalLogs.logs = logs.map(turnRawLogToMinimalLog)
  writeJSON(minimalLogFile, minimalLogs)
}

function getOrgReposFolder(orgName) {
  return path.join(DATA_ROOT, 'orgCache', orgName, 'repos')
}

function getOrgRepoFolder(orgName, repoData) {
  return path.join(getOrgReposFolder(orgName), repoData.name)
}

function getOrgDataFile(orgName) {
  const file = getOrgFile(orgName)
  return readJSON(file)
}

function setOrgDataFile(orgName, data) {
  const file = getOrgFile(orgName)
  return writeJSON(file, data)
}

module.exports = {
  getOrgDataFile,
  setOrgDataFile,
  getOrgReposFolder,
  getOrgRepoFolder,
  getRepoLogFile,
  setRepoLogFile,
  writeJSON,
  readJSON,
  createSubPath,
  getTempFolder,
  clearTempFolders,
  deleteFolder,
  DATA_ROOT,
  DATA_MAPPING_FILE: path.join(DATA_ROOT, 'mapping.json'),
  TWITTER_MAPPING_FILE: path.join(DATA_ROOT, 'twitter_mapping.json'),
}