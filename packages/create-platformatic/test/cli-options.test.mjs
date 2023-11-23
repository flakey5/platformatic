'use strict'

import { test } from 'node:test'
import assert from 'node:assert'
import { getRunPackageManagerInstall, getUseTypescript, getPort } from '../src/cli-options.mjs'

test('getRunPackageManagerInstall', () => {
  assert.deepStrictEqual(
    getRunPackageManagerInstall('npm'),
    {
      type: 'list',
      name: 'runPackageManagerInstall',
      message: 'Do you want to run npm install?',
      default: true,
      choices: [{ name: 'yes', value: true }, { name: 'no', value: false }]
    }
  )
})

test('getUseTypescript', () => {
  assert.deepStrictEqual(
    getUseTypescript(true),
    {
      type: 'list',
      when: false,
      name: 'useTypescript',
      message: 'Do you want to use TypeScript?',
      default: true,
      choices: [{ name: 'yes', value: true }, { name: 'no', value: false }]
    }
  )
})

test('getPort', () => {
  assert.deepStrictEqual(
    getPort(undefined),
    {
      type: 'input',
      name: 'port',
      message: 'What port do you want to use?',
      default: 3042
    }
  )

  assert.deepStrictEqual(
    getPort(undefined),
    {
      type: 'input',
      name: 'port',
      message: 'What port do you want to use?',
      default: 3043
    }
  )

  assert.deepStrictEqual(
    getPort(1234),
    {
      type: 'input',
      name: 'port',
      message: 'What port do you want to use?',
      default: 1234
    }
  )

  assert.deepStrictEqual(
    getPort(undefined),
    {
      type: 'input',
      name: 'port',
      message: 'What port do you want to use?',
      default: 3044
    }
  )
})
