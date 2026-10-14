import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'

import { DeckList } from '../components/lists'
import { cx } from '../lib/utils'
import { Select } from '../components/Select'
import { ErrorState, Pagination, Panel, Spinner } from '../components/ui'
import type { SearchQuery } from '../lib/mtgtop8/types'
import { useSearch, useSearchOptions } from '../lib/queries'
import { Drawer, DrawerIcon, drawerButton } from '../components/Drawer'
import { useDrawer } from '../lib/useDrawer'
import { useIsLarge } from '../lib/useMediaQuery'

// The search lives in the URL, so a result is a link that can be shared and
// the back button returns to the previous search.
const FIELDS = ['format', 'archetype', 'player', 'event', 'deck', 'cards', 'board', 'from', 'to'] as const
type Field = (typeof FIELDS)[number]
type Form = Record<Field, string>

function readForm(params: URLSearchParams): Form {
  return Object.fromEntries(FIELDS.map((field) => [field, params.get(field) ?? ''])) as Form
}

/** The form as the site's search reads it. Blank, it lists the latest decks, as the site does. */
function toQuery(form: Form, page: number): SearchQuery {
  return {
    format: form.format || undefined,
    archetypeId: form.archetype || undefined,
    player: form.player || undefined,
    eventName: form.event || undefined,
    deckName: form.deck || undefined,
    cards: form.cards || undefined,
    board: (form.board || 'main') as SearchQuery['board'],
    dateStart: form.from || undefined,
    dateEnd: form.to || undefined,
    page,
  }
}

// Text fields, in the same style as the dropdowns.
const input =
  'w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm transition-colors placeholder:text-muted/60 hover:border-link/40 focus:border-link focus:ring-2 focus:ring-link/20 focus:outline-none'

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1 text-sm', className)}>
      {label}
      {children}
    </label>
  )
}

/** A field holding a dropdown: a div, since a label would pass its clicks on to the button. */
function SelectField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span aria-hidden="true">{label}</span>
      {children}
    </div>
  )
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const submitted = readForm(params)
  const [form, setForm] = useState<Form>(submitted)
  // Follow the URL when it changes under the form (a player link, back button).
  const [lastParams, setLastParams] = useState(params.toString())
  if (params.toString() !== lastParams) {
    setLastParams(params.toString())
    setForm(readForm(params))
  }

  const options = useSearchOptions()
  const query = toQuery(submitted, page)
  const results = useSearch(query)

  const set = (field: Field) => (event: { target: { value: string } }) =>
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
      // Archetype ids belong to one format.
      ...(field === 'format' ? { archetype: '' } : {}),
    }))

  const choose = (field: Field) => (value: string) => set(field)({ target: { value } })

  // Under lg the form lives in a drawer, over the decks it finds; a search
  // made from it navigates, which closes it.
  const large = useIsLarge()
  const drawer = useDrawer()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setParams(Object.entries(form).filter(([, value]) => value))
  }

  const archetypes = form.format ? (options.data?.archetypes[form.format] ?? []) : []

  const total = results.data?.total
  const filled = FIELDS.filter((field) => submitted[field] && !(field === 'board' && submitted[field] === 'main')).length

  const formElement = (
    <form
      onSubmit={submit}
      className={cx('flex flex-col gap-3 p-4', large && 'rounded-xl border border-line bg-surface')}
    >
      <Field label="Event">
        <input value={form.event} onChange={set('event')} className={input} />
      </Field>
      <Field label="Deck">
        <input value={form.deck} onChange={set('deck')} className={input} />
      </Field>
      <Field label="Player">
        <input value={form.player} onChange={set('player')} className={input} />
      </Field>
      <SelectField label="Format">
        <Select
          label="Format"
          className="w-full"
          value={form.format}
          options={[
            { value: '', label: 'All' },
            ...(options.data?.formats.map((format) => ({ value: format.code, label: format.name })) ?? []),
          ]}
          onChange={choose('format')}
        />
      </SelectField>
      <SelectField label="Archetype">
        <Select
          label="Archetype"
          className="w-full"
          value={form.archetype}
          disabled={!archetypes.length}
          options={[
            { value: '', label: form.format ? 'All archetypes' : 'Choose a format' },
            ...archetypes.map((archetype) => ({ value: archetype.id, label: archetype.name })),
          ]}
          onChange={choose('archetype')}
        />
      </SelectField>
      <SelectField label="Decks must contain following cards">
        <Select
          label="Cards in"
          className="w-full"
          value={form.board || 'main'}
          options={[
            { value: 'main', label: 'Main deck' },
            { value: 'side', label: 'Sideboard' },
            { value: 'both', label: 'Main deck or sideboard' },
          ]}
          onChange={choose('board')}
        />
        <textarea
          value={form.cards}
          onChange={set('cards')}
          className={cx(input, 'min-h-20 resize-y')}
          placeholder={"One card per line"}
          aria-label="Cards"
        />
      </SelectField>
      <fieldset className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-1 lg:gap-1">
        <legend className="mb-1">Period</legend>
        <Field label="From">
          <input type="date" value={form.from} onChange={set('from')} className={input} />
        </Field>
        <Field label="To">
          <input type="date" value={form.to} onChange={set('to')} className={input} />
        </Field>
      </fieldset>
      <div className="flex justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setParams({})}
          className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface-2 max-lg:py-2"
        >
          Reset
        </button>
        <button type="submit" className="rounded-md bg-link px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 max-lg:flex-1 max-lg:py-2">
          Search
        </button>
      </div>
    </form>
  )

  // Laid out as the site's search: the form in a narrow left column, the
  // decks it matches on the right.
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[16rem_1fr]">
      <h1 className="sr-only">Search decks</h1>

      {/* Under lg, the button that opens the form, with how many fields it holds. */}
      {!large && (
        <div className="flex">
          <button type="button" onClick={drawer.show} aria-haspopup="dialog" className={drawerButton}>
            <DrawerIcon />
            Search filters
            {filled > 0 && <span className="rounded-full bg-highlight px-2 text-xs text-highlight-fg">{filled}</span>}
          </button>
        </div>
      )}

      {large ? (
        formElement
      ) : (
        <Drawer open={drawer.open} onClose={drawer.close} title="Search filters">
          {formElement}
        </Drawer>
      )}

      <Panel
        title={total !== undefined ? `${total.toLocaleString()} deck${total === 1 ? '' : 's'} matching` : 'Decks'}
        className="min-w-0"
        loading={results.isPlaceholderData}
      >
        {results.error ? (
          <ErrorState error={results.error} onRetry={results.refetch} />
        ) : results.isPending ? (
          <Spinner label="Searching…" />
        ) : (
          <div>
            <Pagination
              page={results.data.decks.page}
              pageCount={results.data.decks.pageCount}
              onChange={(next) =>
                setParams((current) => {
                  const nextParams = new URLSearchParams(current)
                  nextParams.set('page', String(next))
                  return nextParams
                })
              }
            />
            <DeckList decks={results.data.decks.items} showFormat={!query.format} />
          </div>
        )}
      </Panel>
    </div>
  )
}
