'use client'

import { useCallback, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import {
  createSealPng,
  createSealSvgDataUrl,
  DEFAULT_SEAL_CONFIG,
  getDefaultSealSize,
  getSealSizeOptions,
  getSealStampDimensions,
  normalizeSealConfig,
  SEAL_COLOR_OPTIONS,
  SEAL_TEMPLATE_OPTIONS,
  type SealConfig,
  type SealTemplate,
} from '@/lib/seal'

interface SealEditorProps {
  initialConfig: SealConfig
  hasSavedSeal: boolean
}

function SealEditor({ initialConfig, hasSavedSeal }: SealEditorProps) {
  const {
    sealModal,
    hideSealModal,
    addStamp,
    setSelectedStampId,
    saveSealConfig,
    clearSavedSealConfig,
  } = useStore()
  const [config, setConfig] = useState<SealConfig>({ ...initialConfig })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const sizeOptions = useMemo(() => getSealSizeOptions(config.template), [config.template])
  const previewUrl = useMemo(() => createSealSvgDataUrl(config), [config])

  const templatePreviews = useMemo(() => SEAL_TEMPLATE_OPTIONS.map((template) => ({
    ...template,
    previewUrl: createSealSvgDataUrl({
      ...config,
      template: template.id,
      size: getDefaultSealSize(template.id),
      organizationName: config.organizationName || 'COMPANY SEAL',
      serialText: config.serialText || '1234567890',
    }),
  })), [config])

  const updateConfig = useCallback(<Key extends keyof SealConfig>(key: Key, value: SealConfig[Key]) => {
    setConfig((current) => ({ ...current, [key]: value }))
    setError('')
  }, [])

  const handleTemplateChange = useCallback((template: SealTemplate) => {
    setConfig((current) => ({
      ...current,
      template,
      size: getDefaultSealSize(template),
    }))
    setError('')
  }, [])

  const handleClearSavedSeal = useCallback(() => {
    clearSavedSealConfig()
    setConfig({ ...DEFAULT_SEAL_CONFIG })
    setError('')
  }, [clearSavedSealConfig])

  const handleAddSeal = useCallback(async () => {
    const normalized = normalizeSealConfig(config)
    if (!normalized.organizationName) return

    setIsGenerating(true)
    setError('')

    try {
      const content = await createSealPng(normalized)
      const dimensions = getSealStampDimensions(normalized)
      const id = `seal-${Date.now()}`
      addStamp({
        id,
        type: 'seal',
        x: sealModal.x - dimensions.width / 2,
        y: sealModal.y - dimensions.height / 2,
        width: dimensions.width,
        height: dimensions.height,
        content,
        pageIndex: sealModal.pageIndex,
      })
      saveSealConfig(normalized)
      setSelectedStampId(id)
      setIsGenerating(false)
      hideSealModal()
    } catch {
      setError('We could not create this seal. Please try again.')
      setIsGenerating(false)
    }
  }, [addStamp, config, hideSealModal, saveSealConfig, sealModal, setSelectedStampId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seal-modal-title"
    >
      <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="seal-modal-title" className="text-lg font-semibold text-gray-900">Create a seal</h2>
            <p className="mt-1 text-sm text-gray-500">Your latest seal settings stay saved in this browser.</p>
          </div>
          <button
            type="button"
            onClick={hideSealModal}
            className="ml-4 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close seal editor"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-6">
            <fieldset>
              <legend className="mb-3 text-sm font-medium text-gray-900">Choose a seal style</legend>
              <div className="grid grid-cols-3 gap-3">
                {templatePreviews.map((template) => {
                  const selected = config.template === template.id
                  return (
                    <button
                      type="button"
                      key={template.id}
                      onClick={() => handleTemplateChange(template.id)}
                      className={`rounded-xl border bg-white p-3 text-left transition-all ${
                        selected
                          ? 'border-blue-500 ring-2 ring-blue-100'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      aria-pressed={selected}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={template.previewUrl}
                        alt=""
                        className="mx-auto aspect-square h-20 w-full object-contain sm:h-28"
                      />
                      <span className={`mt-2 block text-center text-xs font-medium ${selected ? 'text-blue-700' : 'text-gray-600'}`}>
                        {template.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-900">Seal size</span>
                <select
                  value={config.size}
                  onChange={(event) => updateConfig('size', event.target.value as SealConfig['size'])}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {sizeOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-900">Seal color</legend>
                <div className="flex h-[42px] items-center gap-3">
                  {SEAL_COLOR_OPTIONS.map((color) => (
                    <button
                      type="button"
                      key={color.id}
                      onClick={() => updateConfig('color', color.id)}
                      className={`h-8 w-8 rounded-md border-2 p-1 transition ${
                        config.color === color.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
                      }`}
                      aria-label={color.label}
                      aria-pressed={config.color === color.id}
                    >
                      <span className="block h-full w-full rounded-sm" style={{ backgroundColor: color.value }} />
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <fieldset className="space-y-4">
              <legend className="mb-3 text-sm font-medium text-gray-900">Seal text</legend>
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-sm text-gray-700">
                  <span>Company or organization name <span className="text-red-500">*</span></span>
                  <span className="text-xs text-gray-400">{Array.from(config.organizationName).length} / 30</span>
                </span>
                <input
                  type="text"
                  value={config.organizationName}
                  maxLength={30}
                  onChange={(event) => updateConfig('organizationName', event.target.value)}
                  placeholder="Example Company Limited"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-sm text-gray-700">
                  <span>Center text <span className="text-gray-400">(optional)</span></span>
                  <span className="text-xs text-gray-400">{Array.from(config.centerText).length} / 10</span>
                </span>
                <input
                  type="text"
                  value={config.centerText}
                  maxLength={10}
                  onChange={(event) => updateConfig('centerText', event.target.value)}
                  placeholder="Official"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-sm text-gray-700">
                  <span>Bottom serial <span className="text-gray-400">(optional)</span></span>
                  <span className="text-xs text-gray-400">{Array.from(config.serialText).length} / 20</span>
                </span>
                <input
                  type="text"
                  value={config.serialText}
                  maxLength={20}
                  onChange={(event) => updateConfig('serialText', event.target.value)}
                  placeholder="1234567890"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </fieldset>
          </div>

          <aside className="rounded-xl border border-gray-200 bg-gray-50 p-4 lg:sticky lg:top-4 lg:self-start">
            <h3 className="text-sm font-medium text-gray-900">Seal preview</h3>
            <div className="mt-3 flex aspect-square items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Seal preview" className="h-full w-full object-contain" />
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">
              {sizeOptions.find((option) => option.id === config.size)?.label}
            </p>
          </aside>
        </div>

        {error && (
          <p className="mx-5 mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 sm:mx-6" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="sm:mr-auto">
            {hasSavedSeal && (
              <button
                type="button"
                onClick={handleClearSavedSeal}
                className="w-full rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 sm:w-auto"
              >
                Clear saved seal
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={hideSealModal}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAddSeal}
            disabled={!config.organizationName.trim() || isGenerating}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? 'Creating…' : 'Add Seal'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SealModal() {
  const { sealModal, savedSealConfig } = useStore()

  if (!sealModal.visible) return null

  return (
    <SealEditor
      initialConfig={savedSealConfig ?? DEFAULT_SEAL_CONFIG}
      hasSavedSeal={savedSealConfig !== null}
    />
  )
}
