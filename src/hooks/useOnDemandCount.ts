import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { fetchRecordCount, getConfig } from '@/data/dataverse'

/**
 * When a table is selected, always fetch a fresh record count via the bridge.
 * This ensures newly added records are reflected when re-selecting a table.
 */
export function useOnDemandCount() {
  const selectedTableId = useAppStore((s) => s.selectedTableId)
  const fetchingRef = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedTableId || getConfig().useMock) return

    const table = useAppStore.getState().tables.find((t) => t.id === selectedTableId)
    if (!table) return

    // Prevent duplicate concurrent fetches for the same table
    if (fetchingRef.current === selectedTableId) return
    fetchingRef.current = selectedTableId

    const tableId = selectedTableId

    console.log(`[OnDemandCount] Fetching count for ${table.name} (${table.entitySetName})`)
    fetchRecordCount(table.name, table.entitySetName, table.primaryIdAttribute)
      .then((count) => {
        useAppStore.getState().updateSingleTableCount(tableId, count)
      })
      .catch((err) => {
        console.warn(`[OnDemandCount] Failed for ${tableId}:`, err)
      })
      .finally(() => {
        if (fetchingRef.current === tableId) {
          fetchingRef.current = null
        }
      })
  }, [selectedTableId])
}
