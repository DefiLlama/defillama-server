
import protocols, { Protocol } from "../protocols/data";
import entities from "../protocols/entities";
import treasuries from "../protocols/treasury";
import inquirer from 'inquirer'
import * as childProcess from 'child_process'
import * as sdk from '@defillama/sdk'
import inquirerPrompt from 'inquirer-autocomplete-prompt'

// @ts-ignore
import inquirerSearchPrompt from 'inquirer-search-list'

import DatePrompt from "inquirer-date-prompt";

// @ts-ignore
inquirer.registerPrompt("date", DatePrompt)
inquirer.registerPrompt('search-list', inquirerSearchPrompt);
inquirer.registerPrompt('autocomplete', inquirerPrompt);
const adapterChoices = [protocols, entities, treasuries].flat().map((p: any) => p.name)
const adaperCommands = ['fillOld', 'fillLast', 'clear-cache', 'delete-tvl']
const commandChoices = [...adaperCommands,]
process.env.AWS_REGION = process.env.AWS_REGION || 'eu-central-1'
process.env.tableName = process.env.tableName || 'prod-table'

const prompts: any = {
  adapter: {
    type: 'search-list',
    name: 'adapter',
    message: 'Select an adapter to run:',
    choices: adapterChoices
  },
  main: {
    type: 'search-list',
    name: 'main',
    message: 'command:',
    choices: commandChoices,
  },
  date: {
    type: "date",
    name: "date",
    message: "timestamp:",
    default: new Date(),
    filter: (d: any) => Math.floor(d.getTime() / 1000),
    // validate: (t: any) => t * 1000 < Date.now(),
    format: { month: 'short', hour: undefined, minute: undefined },
    clearable: true,
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
}

const state: any = {
  runner: 0,
  prevShiftUp: false,
}

async function run(prompt: any) {
  if (prompt)
    state.nextPrompt = prompt
  const runner = state.runner

  while (runner === state.runner) {
    await onPropmtAnswer(await inquirer.prompt([prompts[state.nextPrompt]]))
  }


  async function onPropmtAnswer(response: any) {
    if (runner !== state.runner) return;

    const currentPrompt = state.nextPrompt
    prompts[currentPrompt].default = response[currentPrompt]
    const answer = response[currentPrompt]
    const mainCommand = prompts.main.default
    state.answer = answer
    prompts[currentPrompt].lastAnswer = answer

    switch (currentPrompt) {
      case 'main':
        if (adaperCommands.includes(answer)) {
          state.nextPrompt = 'adapter'
        } else
          throw new Error('Unknown State')
        break;
      case 'adapter':
        if (adapterChoices[0] !== answer)
          adapterChoices.unshift(answer)
        if (['clear-cache', 'fillLast'].includes(mainCommand)) {
          await runScript(mainCommand, [answer])
          state.nextPrompt = 'adapter'
        }
        else if (mainCommand === 'fillOld')
          state.nextPrompt = 'date'
        else if (mainCommand === 'delete-tvl')
          state.nextPrompt = 'dateFrom'
        else
          throw new Error('Unknown State')
        break;
      case 'date':
        if (mainCommand === 'fillOld') {
          await runScript(mainCommand, [prompts.adapter.lastAnswer, answer])
          state.nextPrompt = 'adapter'
        } else
          throw new Error('Unknown State')
        prompts[currentPrompt].default = new Date(answer * 1000)
        break;
      case 'dateFrom':
        if (mainCommand === 'delete-tvl') {
          state.nextPrompt = 'dateTo'
          if (!prompts.dateTo.default || prompts.dateTo.default > prompts.dateFrom.lastAnswer * 1000) prompts.dateTo.default = new Date(prompts.dateFrom.lastAnswer * 1000)
        } else
          throw new Error('Unknown State')
        prompts[currentPrompt].default = new Date(answer * 1000)
        break;
      case 'dateTo':
        if (mainCommand === 'delete-tvl') {
          await runScript(mainCommand, [prompts.adapter.lastAnswer, answer, prompts.dateFrom.lastAnswer,])
          state.nextPrompt = 'main'
        } else
          throw new Error('Unknown State')
        prompts[currentPrompt].default = new Date(answer * 1000)
        break;
    }

    if (currentPrompt !== state.nextPrompt)
      state.prevPrompt = currentPrompt
  }

}

async function start() {
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


async function runScript(script: string, params: any[] = []) {
  const start = +new Date()
  sdk.log('[Start]', script, ...params)
  const env = {
    ...process.env,
  }

  if (script === 'fillOld') env.HISTORICAL = 'true'

  return new Promise((resolve: any, _reject: any) => {
    const subProcess = childProcess.spawn('npm', ['run', script, ...params], { stdio: 'inherit', env: env });

    // catch unhandled errors
process.on('uncaughtException', function (err) {
  console.error('Caught exception: ', err);
  process.exit(1);
});

    subProcess.on('close', (code: any) => {
      const runTime = ((+(new Date) - start) / 1e3).toFixed(1)
      sdk.log(`[Done] ${script} | runtime: ${runTime}s  `)
      if (code === 0) {
        resolve()
      } else {
        sdk.log('[Error]', `Child process exited with code ${code}`, script, ...params)
        resolve();
      }
    });
  });
}
