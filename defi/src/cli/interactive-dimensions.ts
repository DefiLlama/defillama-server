require("dotenv").config();


import inquirer from 'inquirer'
import * as childProcess from 'child_process'
import * as sdk from '@defillama/sdk'
import inquirerPrompt from 'inquirer-autocomplete-prompt'
import loadAdaptorsData from "../adaptors/data"
import { Adapter, AdapterType } from "@defillama/dimension-adapters/adapters/types"
// @ts-ignore
import inquirerSearchPrompt from 'inquirer-search-list'

import DatePrompt from "inquirer-date-prompt";
import sleep from '../utils/shared/sleep'

// @ts-ignore
inquirer.registerPrompt("date", DatePrompt)
inquirer.registerPrompt('search-list', inquirerSearchPrompt);
inquirer.registerPrompt('autocomplete', inquirerPrompt);
let adapterChoices: any = []
process.env.AWS_REGION = process.env.AWS_REGION || 'eu-central-1'
process.env.tableName = process.env.tableName || 'prod-table'
const adapterTypes = Object.values(AdapterType)

const prompts: any = {
  adapter: {
    type: 'search-list',
    name: 'adapter',
    message: 'Protocol:',
    choices: adapterChoices
  },
  main: {
    type: 'search-list',
    name: 'main',
    message: 'Adapter Type:',
    choices: adapterTypes,
    default: AdapterType.FEES,
  },
  dateFrom: {
    type: "date",
    name: "dateFrom",
    message: "timestamp [from]:",
    default: new Date(),
    filter: (d: any) => Math.floor(d.getTime() / 1000),
    // validate: (t: any) => t * 1000 < Date.now(),
    format: { month: 'short', hour: undefined, minute: undefined },
    clearable: true,
    lastAnswer: null,
  },
  dateTo: {
    type: "date",
    name: "dateTo",
    message: "timestamp [to]:",
    default: new Date(),
    filter: (d: any) => Math.floor(d.getTime() / 1000),
    // validate: (t: any) => t * 1000 < (prompts.dateFrom.default ?? Date.now()),
    format: { month: 'short', hour: undefined, minute: undefined },
    clearable: true,
  },
  dryRun: {
    type: 'confirm',
    name: 'dryRun',
    message: 'Is this a dry run? (default: false)',
    default: false,
  },
  onlyMissing: {
    type: 'confirm',
    name: 'onlyMissing',
    message: 'Refilling only missing days? (default: false)',
    default: false,
  },
}

const state: any = {
  runner: 0,
  prevShiftUp: false,
}

const runConfigEnv = {
  type: '',
  protocol: '',
  from: '',
  to: '',
  dry_run: 'false',
  confirm: 'false',
  hide_config_table: 'true',
  refill_only_missing_data: 'false',
}

async function run(prompt: any) {
  if (prompt)
    state.nextPrompt = prompt
  const runner = state.runner

  while (runner === state.runner) {
    await onPromptAnswer(await inquirer.prompt([prompts[state.nextPrompt]]))
  }


  async function onPromptAnswer(response: any) {
    if (runner !== state.runner) return;

    const currentPrompt = state.nextPrompt
    prompts[currentPrompt].default = response[currentPrompt]
    const answer = response[currentPrompt]
    state.answer = answer
    prompts[currentPrompt].lastAnswer = answer

    switch (currentPrompt) {
      case 'main':
        if (adapterTypes.includes(answer)) {
          state.nextPrompt = 'adapter'
          const { protocolAdaptors } = loadAdaptorsData(answer as AdapterType)
          prompts.adapter.choices = protocolAdaptors.map((p: any) => p.displayName)
          runConfigEnv.type = answer
        } else
          throw new Error('Unknown State')
        break;
      case 'adapter':
        if (adapterChoices[0] !== answer)
          adapterChoices.unshift(answer)
        runConfigEnv.protocol = answer
        state.nextPrompt = 'onlyMissing'
        break;
      case 'dateFrom':
        runConfigEnv.from = answer
        prompts[currentPrompt].default = new Date(answer * 1000)
        state.nextPrompt = 'dateTo'
        break;
      case 'dateTo':
        runConfigEnv.to = answer
        prompts[currentPrompt].default = new Date(answer * 1000)
        state.nextPrompt = 'dryRun'
        break;
      case 'onlyMissing':
        runConfigEnv.refill_only_missing_data = answer ? 'true' : 'false'
        prompts[currentPrompt].default = answer
        if (answer)
          state.nextPrompt = 'dryRun'
        else state.nextPrompt = 'dateFrom'
        break;
      case 'dryRun':
        runConfigEnv.dry_run = answer ? 'true' : 'false'
        await runScript()
        state.nextPrompt = 'dryRun'
        break;
    }

    if (currentPrompt !== state.nextPrompt)
      state.prevPrompt = currentPrompt
  }

}

async function start() {
  await sleep(2000)

  console.log('\n\n\n\n\n')
  console.log('------------------------------------')

  delete state.prevPrompt
  delete state.nextPrompt
  state.prevShiftUp = false
  state.runner++
  run('main')
}


// shift + up arrow for one step back
process.stdin.on('keypress', (_key, data) => {
  if (data.name === 'up' && (data.ctrl || data.shift)) {
    state.runner++
    process.stdin.write('\r')
    process.stdin.resume();
    if (!state.prevShiftUp) {
      state.prevShiftUp = true
      run(state.prevPrompt)
    } else {
      start()
    }
  } else
    state.prevShiftUp = false
});

start()


async function runScript() {
  const start = +new Date()
  const env = {
    AWS_REGION: 'eu-central-1',
    tableName: 'prod-table',
    ...process.env,
    ...runConfigEnv
  }

  return new Promise((resolve: any, _reject: any) => {
    const npmPath = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const subProcess = childProcess.spawn(npmPath, ['run', 'fillOld-dimensions'], { stdio: 'inherit', env: env });

    // catch unhandled errors
    process.on('uncaughtException', function (err) {
      console.error('Caught exception: ', err);
      process.exit(1);
    });

    subProcess.on('close', (code: any) => {
      const runTime = ((+(new Date) - start) / 1e3).toFixed(1)
      sdk.log(`[Done] | runtime: ${runTime}s  `)
      if (code === 0) {
        resolve()
      } else {
        sdk.log('[Error]', `Child process exited with code ${code}`)
        resolve();
      }
    });
  });
}
