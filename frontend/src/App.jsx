import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkApiHealth,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  resetSuppliers,
} from './api.js'
import {
  materialFactors,
  transportFactors,
  materials,
  monthlyEmissions,
  regulations,
  REGULATIONS_CHECKED,
} from './data.js'

/* ---------- Helpers ---------- */

const PAGES = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'suppliers', label: 'Suppliers', icon: 'users' },
  { id: 'carbon', label: 'Carbon Footprint', icon: 'leaf' },
  { id: 'compliance', label: 'Trade Compliance', icon: 'shield' },
  { id: 'risk', label: 'Risk Analysis', icon: 'alert' },
  { id: 'recommendations', label: 'AI Recommendations', icon: 'spark' },
  { id: 'reports', label: 'Reports', icon: 'file' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
]

const RISK_LEVELS = ['High', 'Medium', 'Low']
const DEFAULT_SETTINGS = { company: 'Demo Company Ltd', transport: 'Road' }

// Works like useState, but also remembers the value in this browser.
function useSavedState(key, fallback, isValid) {
  const [value, setValue] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key))
      return isValid(saved) ? saved : fallback
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage can be blocked. The app still works until the page is closed.
    }
  }, [key, value])

  return [value, setValue]
}

// The page name is kept in the address bar, so Back and Refresh work.
function getPageFromAddress() {
  const id = window.location.hash.replace('#', '')
  return PAGES.some((p) => p.id === id) ? id : 'overview'
}

function formatNumber(number) {
  return number.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function countBy(list, key) {
  return list.reduce((result, item) => {
    result[item[key]] = (result[item[key]] || 0) + 1
    return result
  }, {})
}

function downloadCSV(filename, rows) {
  const text = rows
    .map((row) =>
      row
        .map((cell) => {
          let value = String(cell)
          // Stops spreadsheet apps from running typed text as a formula.
          if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`
          return `"${value.replace(/"/g, '""')}"`
        })
        .join(','),
    )
    .join('\r\n')

  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- Small reusable components ---------- */

const ICON_PATHS = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8',
  leaf: 'M5 19c0-9 6-14 15-15 0 10-5 15-12 15H5zM4 21c2-5 6-8 11-11',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.500-1-8-4-8-9V6zM8.500 12l2.500 2.500 4.500-5',
  alert: 'M12 3L2 21h20zM12 10v5M12 18h.01',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 16v5M16.500 18.500h5',
  file: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8',
  gear: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4M16 4v4M8 10v4M14 16v4',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M6 6l12 12M18 6L6 18',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
}

function Icon({ name }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

function Card({ title, note, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {title && <h2>{title}</h2>}
      {note && <p className="muted small">{note}</p>}
      {children}
    </section>
  )
}

function Stat({ label, value, hint, icon }) {
  return (
    <div className="card stat">
      <div className="stat-icon"><Icon name={icon} /></div>
      <div>
        <p className="muted small">{label}</p>
        <p className="stat-value">{value}</p>
        <p className="muted small">{hint}</p>
      </div>
    </div>
  )
}

function Badge({ level }) {
  return <span className={`badge badge-${level.toLowerCase()}`}>{level}</span>
}

function Notice({ children }) {
  return <div className="notice"><Icon name="alert" /><p>{children}</p></div>
}

// A simple horizontal bar chart made with HTML and CSS.
function BarList({ items, total }) {
  const max = total || Math.max(1, ...items.map((i) => i.value))
  if (items.length === 0) return <p className="empty">No data yet.</p>
  return (
    <ul className="bar-list">
      {items.map((item) => (
        <li key={item.label}>
          <div className="bar-label"><span>{item.label}</span><strong>{item.display ?? item.value}</strong></div>
          <div className="bar-track">
            <div className={`bar-fill ${item.tone || ''}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function EmissionsChart() {
  const max = Math.max(...monthlyEmissions.map((m) => m.materials + m.transport))
  return (
    <>
      <div className="legend">
        <span><i className="dot dot-materials" />Materials</span>
        <span><i className="dot dot-transport" />Transport</span>
      </div>
      <div className="column-chart">
        {monthlyEmissions.map((m) => {
          const total = m.materials + m.transport
          return (
            <div className="column" key={m.month} title={`${m.month}: materials ${m.materials}, transport ${m.transport} tCO2e`}>
              <span className="column-total">{formatNumber(total)}</span>
              <div className="column-area">
                <div className="column-stack" style={{ height: `${(total / max) * 100}%` }}>
                  <div className="segment-transport" style={{ flex: m.transport }} />
                  <div className="segment-materials" style={{ flex: m.materials }} />
                </div>
              </div>
              <span className="muted small">{m.month}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

function SupplierTable({ suppliers, onEdit, onDelete, disabled }) {
  if (suppliers.length === 0) return <p className="empty">No suppliers found.</p>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Supplier</th><th>Country</th><th>Material</th><th>Documents</th><th>Risk status</th>
            {onDelete && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id}>
              <td><strong>{s.name}</strong></td>
              <td>{s.country}</td>
              <td>{s.material}</td>
              <td>{s.documents}</td>
              <td><Badge level={s.risk} /></td>
              {onDelete && (
                <td className="row-actions">
                  <button className="button-link edit" disabled={disabled} onClick={() => onEdit(s)} aria-label={`Edit ${s.name}`}>Edit</button>
                  <button className="button-link" disabled={disabled} onClick={() => onDelete(s)} aria-label={`Delete ${s.name}`}>Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Shown while supplier data is loading, or if it could not be loaded.
function SupplierStatus({ load, onRetry }) {
  if (load.status === 'loading') {
    return <div className="notice" role="status"><p>Loading suppliers from the backend...</p></div>
  }
  if (load.status === 'error') {
    return (
      <div className="notice load-error" role="alert">
        <p>Supplier data is unavailable. {load.error}</p>
        <button className="button" onClick={onRetry}>Try again</button>
      </div>
    )
  }
  return null
}

/* ---------- Pages ---------- */

function Overview({ suppliers, ready, goTo }) {
  const risk = countBy(suppliers, 'risk')
  const latest = monthlyEmissions[monthlyEmissions.length - 1]
  const previous = monthlyEmissions[monthlyEmissions.length - 2]
  const latestTotal = latest.materials + latest.transport
  const change = ((latestTotal / (previous.materials + previous.transport) - 1) * 100).toFixed(1)

  return (
    <>
      <div className="stat-grid">
        <Stat icon="users" label="Total suppliers" value={ready ? suppliers.length : '—'} hint="In your demo list" />
        <Stat icon="alert" label="High-risk suppliers" value={ready ? risk.High || 0 : '—'} hint="Manually assigned status" />
        <Stat icon="shield" label="Countries" value={ready ? new Set(suppliers.map((s) => s.country.toLowerCase())).size : '—'} hint="Sourcing locations" />
        <Stat icon="leaf" label={`Emissions, ${latest.month} (tCO2e)`} value={formatNumber(latestTotal)} hint={`${change}% vs ${previous.month} · illustrative`} />
      </div>

      <div className="two-columns wide-left">
        <Card title="Monthly emissions (tCO2e)" note="Illustrative data. It is not calculated from your suppliers.">
          <EmissionsChart />
        </Card>
        <Card title="Supplier risk mix">
          {ready ? (
            <BarList
              total={suppliers.length || 1}
              items={RISK_LEVELS.map((level) => ({ label: `${level} risk`, value: risk[level] || 0, tone: level.toLowerCase() }))}
            />
          ) : (
            <p className="empty">Supplier data not loaded.</p>
          )}
        </Card>
      </div>

      <Card title="Recently added suppliers">
        {ready ? <SupplierTable suppliers={suppliers.slice(-5).reverse()} /> : <p className="empty">Supplier data not loaded.</p>}
        <button className="button secondary" onClick={() => goTo('suppliers')}>View all suppliers</button>
      </Card>
    </>
  )
}

const EMPTY_FORM = { name: '', country: '', material: '', risk: '', documents: '' }

function Suppliers({ suppliers, load, onRefresh, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null) // The supplier being edited, or null.
  const [busy, setBusy] = useState(false) // True while waiting for the backend.
  const [message, setMessage] = useState({ type: '', text: '' })
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('All')
  const nameInput = useRef(null)

  const ready = load.status === 'ready'
  const locked = busy || !ready

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  function stopEditing() {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  function startEditing(supplier) {
    const { name, country, material, risk, documents } = supplier
    setEditing(supplier)
    setForm({ name, country, material, risk, documents })
    setMessage({ type: '', text: '' })
    nameInput.current.focus() // Also scrolls the form into view.
  }

  async function saveSupplier(event) {
    event.preventDefault()
    if (locked) return
    const details = { ...form, name: form.name.trim(), country: form.country.trim() }
    if (Object.values(details).some((value) => !value)) {
      setMessage({ type: 'error', text: 'Please fill in every field.' })
      return
    }

    setBusy(true)
    setMessage({ type: '', text: '' })
    try {
      if (editing) {
        await onUpdate(editing.id, details)
      } else {
        await onAdd(details)
      }
      setMessage({ type: 'success', text: `${details.name} was ${editing ? 'updated' : 'added'}.` })
      stopEditing()
      setSearch('')
      setRiskFilter('All')
    } catch (error) {
      // The form keeps what you typed, so you can correct it and try again.
      if (editing && error.status === 404) stopEditing()
      setMessage({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  async function removeSupplier(supplier) {
    if (!window.confirm(`Delete ${supplier.name}?`)) return

    setBusy(true)
    setMessage({ type: '', text: '' })
    try {
      await onDelete(supplier.id)
      if (editing?.id === supplier.id) stopEditing()
      setMessage({ type: 'success', text: `${supplier.name} was deleted.` })
    } catch (error) {
      if (editing?.id === supplier.id && error.status === 404) stopEditing()
      setMessage({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  function refresh() {
    stopEditing()
    setMessage({ type: '', text: '' })
    onRefresh()
  }

  const text = search.trim().toLowerCase()
  const visible = suppliers.filter(
    (s) =>
      (riskFilter === 'All' || s.risk === riskFilter) &&
      `${s.name} ${s.country} ${s.material}`.toLowerCase().includes(text),
  )

  return (
    <>
      <Card
        title={editing ? 'Edit supplier' : 'Add supplier'}
        note="Stored in the backend's memory and reset when the backend restarts. Do not enter confidential information."
      >
        <form className="form-grid" onSubmit={saveSupplier} noValidate>
          <label>Supplier name
            <input ref={nameInput} name="name" value={form.name} onChange={update} maxLength="80" placeholder="e.g. Demo Supplier" />
          </label>
          <label>Country
            <input name="country" value={form.country} onChange={update} maxLength="60" placeholder="e.g. Portugal" />
          </label>
          <label>Material
            <select name="material" value={form.material} onChange={update}>
              <option value="">Select material</option>
              {materials.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label>Risk status
            <select name="risk" value={form.risk} onChange={update}>
              <option value="">Select risk</option>
              {RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label>Documents
            <select name="documents" value={form.documents} onChange={update}>
              <option value="">Select status</option>
              <option>Complete</option><option>Partial</option><option>Missing</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button" type="submit" disabled={locked}>
              {busy ? 'Please wait...' : editing ? 'Save changes' : 'Add supplier'}
            </button>
            {editing && (
              <button className="button secondary" type="button" disabled={busy} onClick={() => { stopEditing(); setMessage({ type: '', text: '' }) }}>
                Cancel
              </button>
            )}
          </div>
        </form>
        <p className={`message ${message.type}`} role="status">{message.text}</p>
      </Card>

      <Card title={ready ? `Suppliers (${visible.length} of ${suppliers.length})` : 'Suppliers'}>
        <div className="toolbar">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, country or material" aria-label="Search suppliers" />
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} aria-label="Filter by risk">
            <option value="All">All risk levels</option>
            {RISK_LEVELS.map((r) => <option key={r} value={r}>{r} risk</option>)}
          </select>
          <button className="button outline" type="button" disabled={busy || load.status === 'loading'} onClick={refresh}>Refresh list</button>
        </div>
        {ready ? (
          <SupplierTable suppliers={visible} onEdit={startEditing} onDelete={removeSupplier} disabled={busy} />
        ) : (
          <p className="empty">Supplier data not loaded.</p>
        )}
      </Card>
    </>
  )
}

function Carbon({ settings, calculations, setCalculations }) {
  const [quantity, setQuantity] = useState('')
  const [material, setMaterial] = useState('Steel')
  const [distance, setDistance] = useState('')
  const [transport, setTransport] = useState(settings.transport)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Hide the old result when an input changes.
  const change = (setter) => (event) => {
    setter(event.target.value)
    setResult(null)
    setError('')
  }

  function calculate(event) {
    event.preventDefault()
    const q = Number(quantity)
    const d = Number(distance)
    if (quantity === '' || distance === '' || !Number.isFinite(q) || !Number.isFinite(d) || q <= 0 || d < 0) {
      setResult(null)
      setError('Enter a quantity above 0 and a distance of 0 or more.')
      return
    }
    const materialEmissions = q * materialFactors[material]
    const transportEmissions = (q * d * transportFactors[transport]) / 1000 // kg to tonnes
    const newResult = {
      id: Date.now(), material, transport, quantity: q, distance: d,
      materialEmissions, transportEmissions, total: materialEmissions + transportEmissions,
    }
    setError('')
    setResult(newResult)
    setCalculations([newResult, ...calculations].slice(0, 10))
  }

  return (
    <>
      <Notice>The emission factors are made-up demonstration values. Do not use these results for official reporting or business decisions.</Notice>
      <div className="two-columns">
        <Card title="Carbon footprint calculator">
          <form className="form-stack" onSubmit={calculate} noValidate>
            <label>Quantity (tonnes)
              <input type="number" min="0" step="any" value={quantity} onChange={change(setQuantity)} placeholder="e.g. 10" />
            </label>
            <label>Material
              <select value={material} onChange={change(setMaterial)}>
                {Object.keys(materialFactors).map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label>Transport distance (km)
              <input type="number" min="0" step="any" value={distance} onChange={change(setDistance)} placeholder="e.g. 500" />
            </label>
            <label>Transport mode
              <select value={transport} onChange={change(setTransport)}>
                {Object.keys(transportFactors).map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <button className="button" type="submit">Calculate footprint</button>
          </form>
          <p className="message error" role="alert">{error}</p>
        </Card>

        <Card title="Estimated result" note="Demonstration estimate">
          <div aria-live="polite">
            {result ? (
              <>
                <p className="result-total">{formatNumber(result.total)} <span>tCO2e</span></p>
                <BarList
                  total={result.total}
                  items={[
                    { label: 'Material', value: result.materialEmissions, display: `${formatNumber(result.materialEmissions)} tCO2e` },
                    { label: 'Transport', value: result.transportEmissions, display: `${formatNumber(result.transportEmissions)} tCO2e` },
                  ]}
                />
                <div className="formula small">
                  <p>Material: {result.quantity} t × {materialFactors[result.material]} tCO2e/t</p>
                  <p>Transport: {result.quantity} t × {result.distance} km × {transportFactors[result.transport]} kgCO2e/t·km ÷ 1,000</p>
                </div>
              </>
            ) : (
              <p className="empty">Fill in the form and select Calculate.</p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Last 10 calculations">
        {calculations.length === 0 ? (
          <p className="empty">No calculations yet.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Material</th><th>Quantity (t)</th><th>Distance (km)</th><th>Mode</th><th>Total (tCO2e)</th></tr></thead>
                <tbody>
                  {calculations.map((c) => (
                    <tr key={c.id}>
                      <td>{c.material}</td><td>{formatNumber(c.quantity)}</td><td>{formatNumber(c.distance)}</td>
                      <td>{c.transport}</td><td><strong>{formatNumber(c.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="button secondary" onClick={() => setCalculations([])}>Clear history</button>
          </>
        )}
      </Card>
    </>
  )
}

function matchingSuppliers(rule, suppliers) {
  if (rule.materials === 'ALL' || rule.materials === 'COMPANY') return []
  return suppliers.filter((s) => rule.materials.includes(s.material))
}

function Compliance({ suppliers, ready }) {
  const [region, setRegion] = useState('All')
  const visible = regulations.filter((r) => region === 'All' || r.region === region)

  return (
    <>
      <Notice>
        Indicative information only, not legal advice. No live legal database is connected. This is a fixed, simplified summary
        prepared on {REGULATIONS_CHECKED}. Rules can change, so check official sources and ask a qualified adviser.
      </Notice>
      <div className="toolbar">
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter by region">
          <option value="All">All regions</option>
          <option>European Union</option>
          <option>United States</option>
        </select>
      </div>
      <div className="card-grid">
        {visible.map((rule) => {
          const matches = matchingSuppliers(rule, suppliers)
          return (
            <Card key={rule.code} className="rule">
              <div className="card-top"><span className="tag">{rule.code}</span><span className="muted small">{rule.region}</span></div>
              <h2>{rule.name}</h2>
              <p>{rule.summary}</p>
              <p><strong>Timing:</strong> {rule.timing}</p>
              <p><strong>Suggested check:</strong> {rule.action}</p>
              <p className="match small">
                {rule.materials === 'ALL' && 'Could be relevant to any material. Depends on origin, destination and supply chain.'}
                {rule.materials === 'COMPANY' && 'Scope depends on company size, not only on materials.'}
                {Array.isArray(rule.materials) && !ready && 'Supplier matching is unavailable until supplier data loads.'}
                {Array.isArray(rule.materials) && ready &&
                  (matches.length
                    ? `Material name match to review: ${matches.map((s) => s.name).join(', ')}`
                    : 'No material name matches in your supplier list. This does not rule the law out.')}
              </p>
              <a href={rule.source} target="_blank" rel="noreferrer">Further reading (official site) ↗</a>
            </Card>
          )
        })}
      </div>
    </>
  )
}

function Risk({ suppliers }) {
  const total = suppliers.length
  const percent = (count) => (total ? Math.round((count / total) * 100) : 0)
  const high = suppliers.filter((s) => s.risk === 'High').length
  const incomplete = suppliers.filter((s) => s.documents !== 'Complete').length

  const countryCounts = Object.entries(countBy(suppliers, 'country')).sort((a, b) => b[1] - a[1])
  const largest = countryCounts[0]

  const indicators = [
    { label: 'High-risk share', value: percent(high), detail: `${high} of ${total} suppliers marked High` },
    { label: 'Document gaps', value: percent(incomplete), detail: `${incomplete} of ${total} have partial or missing documents` },
    { label: 'Country concentration', value: percent(largest ? largest[1] : 0), detail: largest ? `Largest single-country count: ${largest[1]} of ${total}` : 'No suppliers' },
  ]

  const priority = suppliers
    .filter((s) => s.risk === 'High' || s.documents === 'Missing')
    .sort((a, b) => RISK_LEVELS.indexOf(a.risk) - RISK_LEVELS.indexOf(b.risk))

  return (
    <>
      <Notice>These indicators are simple counts from your demo supplier list. Risk status is entered by hand. This is not a verified risk assessment.</Notice>
      <div className="stat-grid three">
        {indicators.map((i) => (
          <Card key={i.label} title={i.label}>
            <p className="result-total">{i.value}<span>%</span></p>
            <div className="bar-track" role="img" aria-label={`${i.label}: ${i.value}%`}>
              <div className="bar-fill" style={{ width: `${i.value}%` }} />
            </div>
            <p className="muted small">{i.detail}</p>
          </Card>
        ))}
      </div>
      <div className="two-columns">
        <Card title="Suppliers by country">
          <BarList items={countryCounts.map(([label, value]) => ({ label, value }))} />
        </Card>
        <Card title="Suppliers by risk status">
          <BarList
            total={total || 1}
            items={RISK_LEVELS.map((level) => ({ label: level, value: suppliers.filter((s) => s.risk === level).length, tone: level.toLowerCase() }))}
          />
        </Card>
      </div>
      <Card title="Priority review list" note="Marked High risk, or documents are missing.">
        <SupplierTable suppliers={priority} />
      </Card>
    </>
  )
}

// Fixed IF/THEN rules with pre-written text. No AI model is used.
function buildRecommendations(suppliers) {
  const list = []
  const names = (items) => items.map((s) => s.name).join(', ')
  const high = suppliers.filter((s) => s.risk === 'High')
  const gaps = suppliers.filter((s) => s.documents !== 'Complete')
  const metals = suppliers.filter((s) => ['Steel', 'Aluminium', 'Cement'].includes(s.material))
  const land = suppliers.filter((s) => ['Timber', 'Coffee', 'Rubber', 'Paper'].includes(s.material))

  if (high.length) list.push({ priority: 'High', title: 'Review high-risk suppliers', text: 'Confirm why each one is marked High, name an owner and agree an action plan.', basis: names(high) })
  if (gaps.length) list.push({ priority: 'High', title: 'Close documentation gaps', text: 'Request the missing evidence and set a follow-up date for each supplier.', basis: names(gaps) })
  if (land.length) list.push({ priority: 'Medium', title: 'Check traceability for land-based materials', text: 'See whether your products are covered by EUDR and what origin data you would need.', basis: names(land) })
  if (metals.length) list.push({ priority: 'Medium', title: 'Ask for product emissions data', text: 'Request measured emissions data, and check whether any imports fall under CBAM.', basis: names(metals) })
  list.push({ priority: 'Low', title: 'Compare lower-carbon transport', text: 'Where timing and routes allow, compare rail or sea with road and air in the calculator.', basis: 'General suggestion, shown to everyone' })
  return list
}

function Recommendations({ suppliers }) {
  return (
    <>
      <Notice>
        <strong>Demo recommendations. No AI is connected.</strong> The text is pre-written and chosen by simple rules based on your
        demo supplier list.
      </Notice>
      <div className="card-grid">
        {buildRecommendations(suppliers).map((r) => (
          <Card key={r.title}>
            <div className="card-top"><span className="tag">DEMO · RULE-BASED</span><Badge level={r.priority} /></div>
            <h2>{r.title}</h2>
            <p>{r.text}</p>
            <p className="match small"><strong>Based on:</strong> {r.basis}</p>
          </Card>
        ))}
      </div>
    </>
  )
}

function Reports({ suppliers, ready, calculations, settings }) {
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
  const header = (title) => [
    [title],
    ['Company', settings.company],
    ['Generated', today],
    ['Notice', 'DEMONSTRATION DATA. Not for official reporting or legal decisions.'],
    [],
  ]

  const reports = [
    {
      title: 'Supplier risk report',
      description: 'Supplier, country, material, document status and risk status.',
      count: suppliers.length,
      unavailable: !ready,
      file: 'suppliers',
      rows: () => [
        ...header('Eco-Logic Supplier Risk Report'),
        ['Supplier', 'Country', 'Material', 'Documents', 'Risk status'],
        ...suppliers.map((s) => [s.name, s.country, s.material, s.documents, s.risk]),
      ],
    },
    {
      title: 'Carbon calculations report',
      description: 'Your last 10 calculator results, using made-up factors.',
      count: calculations.length,
      file: 'carbon',
      rows: () => [
        ...header('Eco-Logic Carbon Calculations (made-up emission factors)'),
        ['Material', 'Quantity (t)', 'Distance (km)', 'Mode', 'Material tCO2e', 'Transport tCO2e', 'Total tCO2e'],
        ...calculations.map((c) => [c.material, c.quantity, c.distance, c.transport, c.materialEmissions.toFixed(3), c.transportEmissions.toFixed(3), c.total.toFixed(3)]),
      ],
    },
    {
      title: 'Monthly emissions report',
      description: 'The illustrative six-month data shown on the Overview page.',
      count: monthlyEmissions.length,
      file: 'monthly-emissions',
      rows: () => [
        ...header('Eco-Logic Illustrative Monthly Emissions'),
        ['Month', 'Materials tCO2e', 'Transport tCO2e', 'Total tCO2e'],
        ...monthlyEmissions.map((m) => [m.month, m.materials, m.transport, m.materials + m.transport]),
      ],
    },
  ]

  return (
    <div className="card-grid">
      {reports.map((r) => (
        <Card key={r.file} title={r.title}>
          <p>{r.description}</p>
          <p className="muted small">{r.unavailable ? 'Supplier data not loaded' : `${r.count} data rows`}</p>
          <button className="button" disabled={r.unavailable || r.count === 0} onClick={() => downloadCSV(`eco-logic-${r.file}-demo-${today}.csv`, r.rows())}>
            <Icon name="download" /> Download CSV
          </button>
          {r.file === 'carbon' && r.count === 0 && <p className="muted small">Use the carbon calculator first.</p>}
        </Card>
      ))}
    </div>
  )
}

function Settings({ settings, setSettings, resetData }) {
  const [draft, setDraft] = useState(settings)
  const [message, setMessage] = useState('')
  const [resetFailed, setResetFailed] = useState(false)
  const [resetting, setResetting] = useState(false)

  function save(event) {
    event.preventDefault()
    const cleaned = { ...draft, company: draft.company.trim() || DEFAULT_SETTINGS.company }
    setDraft(cleaned)
    setSettings(cleaned)
    setResetFailed(false)
    setMessage('Settings saved.')
  }

  async function reset() {
    if (!window.confirm('Reset suppliers, calculations and settings to the original demo data?')) return

    setResetting(true)
    setResetFailed(false)
    setMessage('')
    try {
      await resetData()
      setDraft(DEFAULT_SETTINGS)
      setMessage('Demo data restored.')
    } catch (error) {
      setResetFailed(true)
      setMessage(`Reset was not confirmed. Calculations and settings were not changed. ${error.message}`)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="two-columns">
      <Card title="Workspace settings">
        <form className="form-stack" onSubmit={save}>
          <label>Company name
            <input value={draft.company} maxLength="60" onChange={(e) => { setDraft({ ...draft, company: e.target.value }); setMessage('') }} />
          </label>
          <label>Default transport mode
            <select value={draft.transport} onChange={(e) => { setDraft({ ...draft, transport: e.target.value }); setMessage('') }}>
              {Object.keys(transportFactors).map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <button className="button" type="submit">Save settings</button>
        </form>
        <p className={`message ${resetFailed ? 'error' : 'success'}`} role="status">{message}</p>
      </Card>
      <Card title="Demo data">
        <p>Suppliers are kept in the backend's memory and reset when the backend restarts. Calculations and settings are saved in this browser. This prototype has no login or database.</p>
        <button className="button danger" disabled={resetting} onClick={reset}>{resetting ? 'Resetting...' : 'Reset demo data'}</button>
      </Card>
    </div>
  )
}

/* ---------- Main app ---------- */

export default function App() {
  const [page, setPage] = useState(getPageFromAddress)
  const [menuOpen, setMenuOpen] = useState(false)
  const [apiStatus, setApiStatus] = useState('Checking...')
  // Suppliers now come from the backend, so they are no longer saved in the browser.
  const [suppliers, setSuppliers] = useState([])
  const [supplierLoad, setSupplierLoad] = useState({ status: 'loading', error: '' })
  const [calculations, setCalculations] = useSavedState('ecologic-calculations', [], Array.isArray)
  const [settings, setSettings] = useSavedState('ecologic-settings', DEFAULT_SETTINGS, (v) => Boolean(v?.company && v?.transport))
useEffect(() => {
    let active = true

    checkApiHealth()
      .then((data) => {
        if (active && data.success) {
          setApiStatus('Connected')
        }
      })
      .catch(() => {
        if (active) {
          setApiStatus('Offline')
        }
      })

    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    const onAddressChange = () => {
      setPage(getPageFromAddress())
      setMenuOpen(false)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onAddressChange)
    return () => window.removeEventListener('hashchange', onAddressChange)
  }, [])

  const loadSuppliers = useCallback(async () => {
    setSupplierLoad({ status: 'loading', error: '' })
    try {
      setSuppliers(await getSuppliers())
      setSupplierLoad({ status: 'ready', error: '' })
      setApiStatus('Connected')
    } catch (error) {
      setSuppliers([])
      setSupplierLoad({ status: 'error', error: error.message })
      if (error.status === 0) setApiStatus('Offline')
    }
  }, [])

  // Load the suppliers once when the app opens.
  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  // Handles a failed change, then passes the error on so the page can show it.
  function handleChangeError(error) {
    if (error.status === 0) setApiStatus('Offline')
    // 404 means our list is out of date (for example, after a backend restart).
    if (error.status === 404) loadSuppliers()
    throw error
  }

  // The screen is only updated after the backend confirms each change.
  async function addSupplier(details) {
    try {
      const created = await createSupplier(details)
      setSuppliers((current) => [...current, created])
      setApiStatus('Connected')
    } catch (error) {
      handleChangeError(error)
    }
  }

  async function editSupplier(id, details) {
    try {
      const updated = await updateSupplier(id, details)
      setSuppliers((current) => current.map((s) => (s.id === id ? updated : s)))
      setApiStatus('Connected')
    } catch (error) {
      handleChangeError(error)
    }
  }

  async function removeSupplier(id) {
    try {
      await deleteSupplier(id)
      setSuppliers((current) => current.filter((s) => s.id !== id))
      setApiStatus('Connected')
    } catch (error) {
      handleChangeError(error)
    }
  }

  const goTo = (id) => {
    window.location.hash = id
    setMenuOpen(false)
  }

  const resetData = async () => {
    // Reset the backend first. If this fails, nothing below runs.
    setSuppliers(await resetSuppliers())
    setSupplierLoad({ status: 'ready', error: '' })
    setApiStatus('Connected')
    setCalculations([])
    setSettings(DEFAULT_SETTINGS)
  }

  const suppliersReady = supplierLoad.status === 'ready'
  const supplierPages = ['overview', 'suppliers', 'compliance', 'risk', 'recommendations', 'reports']

  const screens = {
    overview: <Overview suppliers={suppliers} ready={suppliersReady} goTo={goTo} />,
    suppliers: (
      <Suppliers
        suppliers={suppliers}
        load={supplierLoad}
        onRefresh={loadSuppliers}
        onAdd={addSupplier}
        onUpdate={editSupplier}
        onDelete={removeSupplier}
      />
    ),
    carbon: <Carbon settings={settings} calculations={calculations} setCalculations={setCalculations} />,
    compliance: <Compliance suppliers={suppliers} ready={suppliersReady} />,
    // These two pages are built entirely from supplier data, so they wait for it.
    risk: suppliersReady && <Risk suppliers={suppliers} />,
    recommendations: suppliersReady && <Recommendations suppliers={suppliers} />,
    reports: <Reports suppliers={suppliers} ready={suppliersReady} calculations={calculations} settings={settings} />,
    settings: <Settings settings={settings} setSettings={setSettings} resetData={resetData} />,
  }

  const title = PAGES.find((p) => p.id === page).label

  return (
    <div className="app">
      <aside id="sidebar" className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><Icon name="leaf" /></span>
          <span>Eco-Logic</span>
          <button className="icon-button close-menu" onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <nav aria-label="Main navigation">
          {PAGES.map((p) => (
            <button key={p.id} className={`nav-item ${page === p.id ? 'active' : ''}`} aria-current={page === p.id ? 'page' : undefined} onClick={() => goTo(p.id)}>
              <Icon name={p.icon} />{p.label}
            </button>
          ))}
        </nav>
        <p className="sidebar-note">Prototype version<br />No live AI or legal data connected.</p>
      </aside>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <div className="content">
        <header className="topbar">
          <button className="icon-button open-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="sidebar"><Icon name="menu" /></button>
          <div className="topbar-title">
            <h1>{title}</h1>
            <p className="muted small">{settings.company}</p>
          </div>  
          <span className="demo-pill">Backend: {apiStatus}</span>
          <span className="demo-pill">Demonstration data</span>
        </header>
        {/* The key gives each page a fresh start when you switch pages. */}
        <main key={page}>
          {/* This wrapper stays in place so the page below keeps its form contents. */}
          <div className="status-slot">
            {supplierPages.includes(page) && <SupplierStatus load={supplierLoad} onRetry={loadSuppliers} />}
          </div>
          {screens[page]}
        </main>
        <footer className="muted small">Eco-Logic · Frontend prototype for demonstration purposes only</footer>
      </div>
    </div>
  )
}
