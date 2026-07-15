import { createRegistry, importOpenApi } from './index.js'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('SpecRegistry register/list/filter', () => {
  const reg = createRegistry([
    {
      name: 'A',
      method: 'get',
      url: '/a',
      tags: ['domain:x'],
    },
    {
      name: 'B',
      method: 'post',
      url: '/b',
      tags: ['domain:y'],
    },
  ])
  assert.equal(reg.size(), 2)
  assert.equal(reg.list({ tags: ['domain:x'] }).length, 1)
  assert.equal(reg.get('A')?.method, 'get')
})

test('importOpenApi requires operationId', () => {
  assert.throws(() =>
    importOpenApi({
      paths: {
        '/pets': {
          get: { summary: 'list' },
        },
      },
    })
  )

  const materials = importOpenApi({
    paths: {
      '/pets': {
        get: {
          operationId: 'listPets',
          tags: ['pet'],
          summary: 'List pets',
        },
      },
    },
  })
  assert.equal(materials[0].name, 'listPets')
  assert.equal(materials[0].source, 'openapi')
})
