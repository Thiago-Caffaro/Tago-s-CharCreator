import client from './client'
import { triggerDownload } from '../utils/cardExporter'

export const configApi = {
  exportConfig: async () => {
    const data = await client.get('/config/export').then(r => r.data)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    triggerDownload(blob, 'tagos_charcreator_config.json')
  },

  importConfig: (data: object) =>
    client.post<{ imported: Record<string, { created: number; updated: number; ignored: number; errors: number }> }>('/config/import', data).then(r => r.data),
}
