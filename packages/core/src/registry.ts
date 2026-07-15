import type { Material } from './types.js'

function normalizeTags(tags?: string[] | string): string[] {
  if (!tags) return []
  return Array.isArray(tags) ? tags.map(String) : [String(tags)]
}

function normalizeMaterial(input: Material): Material {
  if (!input?.name) {
    throw new Error('SpecRegistry: material.name is required')
  }
  if (!input.method) {
    throw new Error(`SpecRegistry: material "${input.name}" missing method`)
  }
  if (!input.url) {
    throw new Error(`SpecRegistry: material "${input.name}" missing url`)
  }
  return {
    ...input,
    method: String(input.method).toLowerCase(),
    tags: normalizeTags(input.tags),
    source: input.source || 'manual',
  }
}

/**
 * Interface catalog: discover / describe / filter materials for humans and AI.
 */
export class SpecRegistry {
  private materials = new Map<string, Material>()

  register(material: Material | Material[]): this {
    const list = Array.isArray(material) ? material : [material]
    for (const item of list) {
      const m = normalizeMaterial(item)
      this.materials.set(m.name, m)
    }
    return this
  }

  upsert(material: Material): this {
    return this.register(material)
  }

  remove(name: string): boolean {
    return this.materials.delete(name)
  }

  clear(): void {
    this.materials.clear()
  }

  get(name: string): Material | undefined {
    return this.materials.get(name)
  }

  has(name: string): boolean {
    return this.materials.has(name)
  }

  list(filter?: { tags?: string[] }): Material[] {
    const all = [...this.materials.values()]
    if (!filter?.tags?.length) return all
    return all.filter(m => filter.tags!.every(t => m.tags.includes(t)))
  }

  size(): number {
    return this.materials.size
  }

  toJSON(): Material[] {
    return this.list()
  }
}

export function createRegistry(materials?: Material[]): SpecRegistry {
  const registry = new SpecRegistry()
  if (materials?.length) registry.register(materials)
  return registry
}
