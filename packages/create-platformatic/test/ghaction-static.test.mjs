'use strict'

import { before, after, test } from 'node:test'
import assert from 'node:assert'
import { mkdtemp, readFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { isFileAccessible } from '../src/utils.mjs'
import { createStaticWorkspaceGHAction } from '../src/ghaction.mjs'
import { parse } from 'yaml'

let log = []
let tmpDir
const fakeLogger = {
  info: msg => { log.push(msg) },
  warn: msg => { log.push(msg) }
}

before(async () => {
  log = []
  tmpDir = await mkdtemp(join(tmpdir(), 'test-create-platformatic-'))
})

after(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

const env = {
  DATABASE_URL: 'mydbconnectionstring',
  PLT_SERVER_LOGGER_LEVEL: 'info'
}

test('creates gh action', async () => {
  await createStaticWorkspaceGHAction(fakeLogger, env, 'db', tmpDir, false)
  assert.strictEqual(log[0], 'Github action successfully created, please add the following secrets as repository secrets: ')
  const accessible = await isFileAccessible(join(tmpDir, '.github/workflows/platformatic-static-workspace-deploy.yml'))
  assert.strictEqual(accessible, true)
  const ghFile = await readFile(join(tmpDir, '.github/workflows/platformatic-static-workspace-deploy.yml'), 'utf8')
  const ghAction = parse(ghFile)
  const { steps, permissions, env: jobEnv } = ghAction.jobs.build_and_deploy

  assert.strictEqual(steps.length, 3)
  assert.strictEqual(steps[0].name, 'Checkout application project repository')
  assert.strictEqual(steps[1].name, 'npm install --omit=dev')
  assert.strictEqual(steps[2].name, 'Deploy project')
  assert.match(jobEnv.DATABASE_URL, /\$\{\{ secrets.DATABASE_URL \}\}/)
  assert.strictEqual(jobEnv.PLT_SERVER_LOGGER_LEVEL, 'info')

  assert.strictEqual(permissions.contents, 'read')
  // check env indentation is correct
  assert.strictEqual(ghFile, `
    env:
      DATABASE_URL: \${{ secrets.DATABASE_URL }}
      PLT_SERVER_LOGGER_LEVEL: info`)
})

test('env block is not created with empty env', async () => {
  await createStaticWorkspaceGHAction(fakeLogger, {}, 'db', tmpDir, false)
  const ghFile = await readFile(join(tmpDir, '.github/workflows/platformatic-static-workspace-deploy.yml'), 'utf8')
  const ghAction = parse(ghFile)
  const { env } = ghAction.jobs.build_and_deploy
  assert.strictEqual(env, undefined)
})

test('creates gh action with TS build step', async () => {
  await createStaticWorkspaceGHAction(fakeLogger, env, 'db', tmpDir, true)
  assert.strictEqual(log[0], 'Github action successfully created, please add the following secrets as repository secrets: ')
  const accessible = await isFileAccessible(join(tmpDir, '.github/workflows/platformatic-static-workspace-deploy.yml'))
  assert.strictEqual(accessible, true)
  const ghFile = await readFile(join(tmpDir, '.github/workflows/platformatic-static-workspace-deploy.yml'), 'utf8')
  const ghAction = parse(ghFile)
  const { steps, permissions, env: jobEnv } = ghAction.jobs.build_and_deploy
  assert.strictEqual(steps.length, 4)
  assert.strictEqual(steps[0].name, 'Checkout application project repository')
  assert.strictEqual(steps[1].name, 'npm install --omit=dev')
  assert.strictEqual(steps[2].name, 'Build project')
  assert.strictEqual(steps[3].name, 'Deploy project')
  assert.match(jobEnv.DATABASE_URL, /\$\{\{ secrets.DATABASE_URL \}\}/)
  assert.strictEqual(jobEnv.PLT_SERVER_LOGGER_LEVEL, 'info')

  assert.strictEqual(permissions.contents, 'read')
})

test('creates gh action with a warn if a .git folder is not present', async () => {
  await createStaticWorkspaceGHAction(fakeLogger, env, 'db', tmpDir)
  assert.strictEqual(log[0], 'Github action successfully created, please add the following secrets as repository secrets: ')
  const accessible = await isFileAccessible(join(tmpDir, '.github/workflows/platformatic-static-workspace-deploy.yml'))
  assert.strictEqual(accessible, true)
  const secretsLogLine = log[1].split('\n')
  assert.strictEqual(secretsLogLine[1].trim(), 'PLATFORMATIC_STATIC_WORKSPACE_ID: your workspace id')
  assert.strictEqual(secretsLogLine[2].trim(), 'PLATFORMATIC_STATIC_WORKSPACE_API_KEY: your workspace API key')
  assert.strictEqual(secretsLogLine[3].trim(), 'DATABASE_URL: mydbconnectionstring')
  assert.strictEqual(log[2], 'No git repository found. The Github action won\'t be triggered.')
})

test('creates gh action without a warn if a .git folder is present', async () => {
  await mkdir(join(tmpDir, '.git'), { recursive: true })
  await createStaticWorkspaceGHAction(fakeLogger, env, 'db', tmpDir)
  assert.strictEqual(log[0], 'Github action successfully created, please add the following secrets as repository secrets: ')
  const accessible = await isFileAccessible(join(tmpDir, '.github/workflows/platformatic-static-workspace-deploy.yml'))
  assert.strictEqual(accessible, true)
  assert.strictEqual(log.length, 2)
})
