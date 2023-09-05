
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
const adaperCommands = ['fillOld', 'fillLast', 'clear-cache']
const commandChoices = [...adaperCommands,]

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
    pageSize: Math.min(commandChoices.length, 3)
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
  }
}

const state: any = {
  runner: 0,
  prevShiftUp: false,
}


function importAdapter(protocol: Protocol) {
  return require("@defillama/adapters/projects/" + [protocol.module])
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
        else
          throw new Error('Unknown State')
        break;
      case 'date':
        prompts[currentPrompt].default = new Date(prompts[currentPrompt].default * 1000)
        if (mainCommand === 'fillOld') {
          await runScript(mainCommand, [prompts.adapter.default, answer])
          state.nextPrompt = 'adapter'
        } else
          throw new Error('Unknown State')
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
