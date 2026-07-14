import { ExternalLink, FileText, Link2, Paperclip, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import type { ReservationFile } from '../types'
import { openReservationFile, reservationFileName } from '../attachments/ReservationAttachments'

// Plugin route bodies go through TREK's 100 KB JSON parser. Base64 expands the
// bytes in transit, so leave room for the surrounding request envelope.
const PLUGIN_UPLOAD_MAX_BYTES = 64 * 1024

export function ReservationFilesSection({
  files,
  allFiles,
  reservationId,
  isSaved,
  pendingFiles,
  onAddPending,
  onRemovePending,
  onUpload,
  onLink,
  onRemove,
}: {
  files: ReservationFile[]
  allFiles: ReservationFile[]
  reservationId: number | null
  isSaved: boolean
  pendingFiles: File[]
  onAddPending: (file: File) => void
  onRemovePending: (index: number) => void
  onUpload: (file: File) => Promise<void>
  onLink: (file: ReservationFile) => Promise<void>
  onRemove: (file: ReservationFile) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [linkingId, setLinkingId] = useState<number | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const attachedIds = new Set(files.map((file) => file.id))
  const availableFiles = allFiles.filter((file) => file.id != null && !attachedIds.has(file.id))

  const pickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size === 0) {
      setFileError('Empty files cannot be attached.')
      return
    }
    if (file.size > PLUGIN_UPLOAD_MAX_BYTES) {
      setFileError('Files larger than 64 KB cannot be uploaded through a plugin. Use the Files tab, then link it here.')
      return
    }
    setFileError(null)
    if (!isSaved) {
      onAddPending(file)
      return
    }
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
    }
  }

  const link = async (file: ReservationFile) => {
    if (file.id == null) return
    setLinkingId(file.id)
    try {
      await onLink(file)
      setShowPicker(false)
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <section>
      <label className="mb-[6px] block text-[11px] font-semibold uppercase tracking-[0.03em] text-content-faint">
        Files
      </label>
      <div className="flex flex-col gap-2">
        {files.map((file) => {
          const isDirect = Number(file.reservation_id) === reservationId
          return (
            <div key={file.id} className="flex items-center gap-2 rounded-lg bg-surface-secondary px-2.5 py-[5px]">
              <FileText size={12} className="shrink-0 text-content-muted" />
              <span className="min-w-0 flex-1 truncate text-[12px] text-content-secondary">
                {reservationFileName(file)}
              </span>
              {typeof file.url === 'string' && file.url && (
                <button
                  type="button"
                  onClick={() => openReservationFile(file)}
                  title="Open file"
                  className="flex shrink-0 cursor-pointer bg-transparent p-0 text-content-faint"
                >
                  <ExternalLink size={11} />
                </button>
              )}
              {isDirect ? (
                <button
                  type="button"
                  onClick={() => onRemove(file)}
                  title="Detach file"
                  className="flex shrink-0 cursor-pointer bg-transparent p-0 text-content-faint"
                >
                  <X size={11} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="TREK does not expose removal of secondary file links to plugins"
                  className="flex shrink-0 cursor-not-allowed bg-transparent p-0 text-content-faint opacity-50"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )
        })}
        {pendingFiles.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center gap-2 rounded-lg bg-surface-secondary px-2.5 py-[5px]"
          >
            <FileText size={12} className="shrink-0 text-content-muted" />
            <span className="min-w-0 flex-1 truncate text-[12px] text-content-secondary">{file.name}</span>
            <button
              type="button"
              onClick={() => onRemovePending(index)}
              title="Remove pending file"
              className="flex shrink-0 bg-transparent p-0 text-content-faint"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <input ref={inputRef} className="hidden" type="file" onChange={pickFile} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex cursor-pointer items-center gap-[5px] rounded-lg border border-dashed border-edge bg-transparent px-2.5 py-1.5 text-[11px] text-content-faint disabled:cursor-default disabled:opacity-50"
          >
            <Paperclip size={11} /> {uploading ? 'Uploading…' : 'Attach file'}
          </button>
          {isSaved && availableFiles.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPicker((current) => !current)}
              className="flex cursor-pointer items-center gap-[5px] rounded-lg border border-dashed border-edge bg-transparent px-2.5 py-1.5 text-[11px] text-content-faint"
            >
              <Link2 size={11} /> Link existing
            </button>
          )}
        </div>
        {showPicker && (
          <div className="max-h-52 overflow-y-auto rounded-[10px] border border-edge bg-surface-card p-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
            {availableFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                disabled={linkingId === file.id}
                onClick={() => link(file)}
                className="flex w-full items-center gap-2 rounded-[7px] bg-transparent px-2.5 py-1.5 text-left text-[12px] text-content-secondary hover:bg-surface-muted disabled:opacity-50"
              >
                <FileText size={12} className="shrink-0 text-content-faint" />
                <span className="min-w-0 flex-1 truncate">{reservationFileName(file)}</span>
              </button>
            ))}
          </div>
        )}
        {fileError && <p className="m-0 text-[11px] text-danger">{fileError}</p>}
        {!isSaved && pendingFiles.length === 0 && (
          <p className="m-0 text-[11px] text-content-faint">Files will upload after the reservation is created.</p>
        )}
      </div>
    </section>
  )
}
