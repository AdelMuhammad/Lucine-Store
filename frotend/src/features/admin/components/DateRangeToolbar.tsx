import type { ReactNode } from 'react'
import { useTranslation } from '../../../hooks/useTranslation'
import { RANGE_PRESETS, type RangePreset } from '../analytics'

type DateRangeToolbarProps = {
  preset: RangePreset
  onPresetChange: (preset: RangePreset) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
  /** Extra actions on the right, e.g. export buttons. */
  children?: ReactNode
  /** Summary line, e.g. the number of orders currently in range. */
  countLabel?: string
}

/**
 * Shared date-range filter used by the dashboard and the analytics page:
 * preset select (today / yesterday / week / month / all) plus optional custom
 * from-to date inputs.
 */
function DateRangeToolbar({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  children,
  countLabel,
}: DateRangeToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="admin-toolbar">
      <select
        aria-label={t('admin.analyticsRangeLabel')}
        className="admin-toolbar__select"
        onChange={(event) =>
          onPresetChange(event.target.value as RangePreset)
        }
        value={preset}
      >
        {RANGE_PRESETS.map((option) => (
          <option key={option} value={option}>
            {t(`analyticsPreset.${option}`)}
          </option>
        ))}
        <option value="custom">{t('analyticsPreset.custom')}</option>
      </select>

      {preset === 'custom' && (
        <>
          <input
            aria-label={t('admin.analyticsFrom')}
            className="admin-toolbar__date"
            onChange={(event) => onCustomFromChange(event.target.value)}
            type="date"
            value={customFrom}
          />
          <input
            aria-label={t('admin.analyticsTo')}
            className="admin-toolbar__date"
            onChange={(event) => onCustomToChange(event.target.value)}
            type="date"
            value={customTo}
          />
        </>
      )}

      {children}

      {countLabel && (
        <span className="admin-toolbar__count">{countLabel}</span>
      )}
    </div>
  )
}

export default DateRangeToolbar