import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * useRFQSocket — subscribes to real-time bid updates for a single RFQ.
 *
 * @param {string|number} rfqId  - The RFQ ID to subscribe to.
 * @param {object} handlers      - Callback handlers:
 *   onBidUpdate(data)           - fired when any bid is placed on this RFQ
 *   onForceClosed(data)         - fired when the RFQ is force-closed
 */
export function useRFQSocket(rfqId, { onBidUpdate, onForceClosed } = {}) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!rfqId) return

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.emit('join_rfq', rfqId)

    if (onBidUpdate) {
      socket.on('bid_update', (data) => {
        if (data.rfq_id === parseInt(rfqId)) onBidUpdate(data)
      })
    }

    if (onForceClosed) {
      socket.on('rfq_force_closed', (data) => {
        if (data.rfq_id === parseInt(rfqId)) onForceClosed(data)
      })
    }

    return () => {
      socket.emit('leave_rfq', rfqId)
      socket.disconnect()
    }
  }, [rfqId]) // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef
}
