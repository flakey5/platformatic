'use strict'

import { test } from 'node:test'
import assert from 'node:assert'
import { createReadme } from '../src/create-readme.mjs'
import { fileURLToPath } from 'node:url'
import { readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

const fakeLogger = {
  debug: () => {}
}

test('should create readme in current directory', async () => {
  const targetFilename = join(__dirname, 'README.md')

  await createReadme(fakeLogger, __dirname, 'service')
  const fileData = await readFile(targetFilename, 'utf8')
  assert.strictEqual(typeof fileData, 'string')

  await unlink(targetFilename)
})
