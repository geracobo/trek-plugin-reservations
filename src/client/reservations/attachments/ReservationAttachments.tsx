import { Download, FileText } from 'lucide-react'
import type { ReservationFile } from '../types'
import Modal from '../../trek-ui/Modal'

export function reservationFileName(file: ReservationFile) {
  return file.original_name || file.filename || file.name || 'Unnamed file'
}

export function openReservationFile(file: ReservationFile) {
  if (typeof file.url !== 'string' || !file.url) {
    window.trek.notify('error', 'This file is not available for download.')
    return
  }
  window.trek.openExternal(new URL(file.url, window.location.origin).href)
}

interface ReservationAttachmentDialogProps {
  files: ReservationFile[] | null
  onClose: () => void
}

export function ReservationAttachmentDialog({ files, onClose }: ReservationAttachmentDialogProps) {
  return (
    <Modal isOpen={Boolean(files)} onClose={onClose} title="Attached files" size="sm">
      <div className="flex flex-col gap-1.5">
        {files?.map((file, index) => (
          <div
            key={file.id ?? `${reservationFileName(file)}-${index}`}
            className="flex items-center gap-2 rounded-lg bg-surface-secondary px-2.5 py-[5px]"
          >
            <FileText size={12} className="shrink-0 text-content-muted" />
            <span className="min-w-0 flex-1 truncate text-[12px] text-content-secondary">
              {reservationFileName(file)}
            </span>
            <button
              type="button"
              onClick={() => openReservationFile(file)}
              title={`Download ${reservationFileName(file)}`}
              className="flex shrink-0 cursor-pointer bg-transparent p-0 text-content-faint hover:text-content"
            >
              <Download size={12} />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
