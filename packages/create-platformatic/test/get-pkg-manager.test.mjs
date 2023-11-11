import { before, test } from 'node:test'
import assert from 'node:assert'
import { getPkgManager } from '../src/get-pkg-manager.mjs'

before(() => {
  delete process.env.npm_config_user_agent
})

test('detects npm', () => {
  process.env.npm_config_user_agent = 'npm/7.18.1 node/v16.4.2 darwin x64'
  assert.strictEqual(getPkgManager(), 'npm')
})

test('detects yarn', () => {
  process.env.npm_config_user_agent = 'yarn/1.22.10 npm/? node/v16.4.2 darwin x64'
  assert.strictEqual(getPkgManager(), 'yarn')
})

test('detects pnpm', () => {
  process.env.npm_config_user_agent = 'pnpm/6.14.1 npm/? node/v16.4.2 darwin x64'
  assert.strictEqual(getPkgManager(), 'pnpm')
})

test('detects cnpm', () => {
  process.env.npm_config_user_agent = 'cnpm/7.0.0 npminsall/1.0.0 node/v16.4.2 darwin x64'
  assert.strictEqual(getPkgManager(), 'cnpm')
})

test('defaults to npm if the user agent is unknown', () => {
  process.env.npm_config_user_agent = 'xxxxxxxxxxxxxxxxxx'
  assert.strictEqual(getPkgManager(), 'npm')
})

test('defaults to npm if the user agent is not set', () => {
  delete process.env.npm_config_user_agent
  assert.strictEqual(getPkgManager(), 'npm')
})
