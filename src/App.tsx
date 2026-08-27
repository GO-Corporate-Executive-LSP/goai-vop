import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  calculateVop,
  CHAOS_OPTIONS,
  decodeScenario,
  DEFAULT_INPUTS,
  encodeScenario,
  PRESETS,
  type ChaosKey,
  type VopInputs,
  type VopResult,
} from './vop.js';

const ROUTES = [
  ['/', 'Overview'],
  ['/scenario', 'Scenario Lab'],
  ['/journey', 'Journey Economics'],
  ['/anatomy', 'Value Anatomy'],
  ['/compare', 'Compare'],
  ['/creator', 'Creator'],
  ['/analyst', 'Analyst'],
  ['/methodology', 'Methodology'],
] as const;

function money(n: number, digits = 0) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(n);
}
function pct(n: number) { return `${Math.round(n)}%`; }
function minutes(n: number) {
  if (n < 60) return `${Math.round(n)}m`;
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  return `${h}h ${m}m`;
}

function Badge({ children, tone = 'gold' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
function Card({ label, title, children, className = '', hint }: { label: string; title?: string; children: ReactNode; className?: string; hint?: string }) {
  return (
    <section className={`card ${className}`}>
      <div className="card__label">{label}</div>
      {title ? <div className="card__title"><h2>{title}</h2></div> : null}
      {children}
      {hint ? <div className="card__hint">{hint}</div> : null}
    </section>
  );
}
function StatCard({ label, value, caption, tone = '' }: { label: string; value: string; caption: string; tone?: 'gold' | 'ice' | 'positive' | '' }) {
  return (
    <Card label={label} className={tone === 'gold' ? 'card--accent' : ''}>
      <div className={`figure ${tone ? `figure--${tone}` : ''}`}>{value}</div>
      <div className="meta" style={{ marginTop: 8 }}>{caption}</div>
    </Card>
  );
}
function PageHead({ eyebrow, title, lede, action }: { eyebrow: string; title: string; lede: string; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <div className="page-head__eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="page-head__lede">{lede}</p>
      </div>
      {action}
    </div>
  );
}

function Shell({ children, busy }: { children: ReactNode; busy: boolean }) {
  return (
    <div className="shell">
      <header className="nav">
        <div className="nav__inner">
          <NavLink to="/" className="brand"><span className="brand__mark">GÖ.AI</span><span className="brand__sub">VOP™ Studio</span></NavLink>
          <nav className="nav__links" aria-label="Primary">
            {ROUTES.map(([path, label]) => <NavLink key={path} to={path} end={path === '/'} className="nav__link">{label}</NavLink>)}
          </nav>
          <div className="nav__actions">
            {busy ? <Badge tone="ice">◌ Recalculating</Badge> : <Badge tone="positive">● Live model</Badge>}
          </div>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">GÖ.AI VOP™ Studio · Illustrative economic modeling, not a guarantee of realized savings. Model weights remain server-side.</footer>
    </div>
  );
}

function HeroValue({ result }: { result: VopResult }) {
  return (
    <Card label="Executive travel value" className="hero-value card--accent">
      <div className="row row--between"><Badge tone="gold">VOP {result.modelVersion}</Badge><Badge tone={result.confidence === 'High' ? 'positive' : 'warning'}>{result.confidence} confidence</Badge></div>
      <div style={{ marginTop: 24 }}>
        <div className="figure figure--hero figure--gold">{money(result.valueProtected)}</div>
        <div className="hero-value__range">Estimated Value Protected · range {money(result.valueProtectedLow)}–{money(result.valueProtectedHigh)}</div>
      </div>
      <div className="hero-value__sub">
        <div><strong>{result.vopMultiple.toFixed(1)}×</strong><span>Value-to-Price</span></div>
        <div><strong>{pct(result.estimatedRoiPct)}</strong><span>Estimated ROI</span></div>
        <div><strong>{money(result.annualValueProtected)}</strong><span>Annualized modeled value</span></div>
      </div>
    </Card>
  );
}

function ValueLayerChart({ result }: { result: VopResult }) {
  const rows = [
    { name: 'Attention', value: result.components.attention, fill: '#f1cf69' },
    { name: 'Coordination', value: result.components.coordination, fill: '#9ad7ff' },
    { name: 'Continuity', value: result.components.continuity, fill: '#b9a6f2' },
    { name: 'Mission', value: result.components.mission, fill: '#4bbf8a' },
  ];
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, left: 20, bottom: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'rgba(255,255,255,.48)', fontSize: 11 }} tickFormatter={(v) => `$${Math.round(v)}`} />
          <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,.68)', fontSize: 12 }} width={90} />
          <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ background: '#030507', border: '1px solid rgba(255,255,255,.11)', borderRadius: 10 }} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>{rows.map((r) => <Cell key={r.name} fill={r.fill} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Overview({ inputs, result }: { inputs: VopInputs; result: VopResult }) {
  return (
    <>
      <PageHead eyebrow="Overview" title="Executive travel value" lede="A live economic model of time, coordination, continuity, and mission value protected by orchestrating the journey as one system." action={<Badge tone="intel">◆ Deterministic model</Badge>} />
      <div className="grid grid--wide-left"><HeroValue result={result} /><Card label="Current scenario" title="What the model is solving"><div className="stack stack--tight"><div className="row row--between"><span className="muted">Executive band</span><strong>{inputs.executiveBand.toUpperCase()}</strong></div><div className="row row--between"><span className="muted">Journey</span><strong>{inputs.totalLegs} legs</strong></div><div className="row row--between"><span className="muted">Criticality</span><strong>{inputs.criticality}/100</strong></div><div className="row row--between"><span className="muted">Automation</span><strong>{inputs.automation}</strong></div><div className="row row--between"><span className="muted">Chaos events</span><strong>{inputs.chaos.length}</strong></div></div></Card></div>
      <div className="grid grid--6 section">
        <StatCard label="Value protected" value={money(result.valueProtected)} caption="Modeled value preserved by orchestration" tone="gold" />
        <StatCard label="Value at risk" value={money(result.valueAtRisk)} caption="Economic exposure in the modeled journey" />
        <StatCard label="Time returned" value={minutes(result.timeReturnedMinutes)} caption={`${result.manualMinutes}m fragmented vs ${result.goaiMinutes}m GÖ.AI`} tone="ice" />
        <StatCard label="VOP multiple" value={`${result.vopMultiple.toFixed(1)}×`} caption={`Against ${money(inputs.platformFee)} modeled platform fee`} />
        <StatCard label="Touches removed" value={`${result.touchesRemoved}`} caption="Estimated manual coordination actions" />
        <StatCard label="Residual exposure" value={money(result.residualExposure)} caption="Risk that remains after orchestration" />
      </div>
      <div className="grid grid--wide-left section">
        <Card label="Value protected by layer" title="Where the economics come from" hint="Mission value is overlap-capped so schedule consequences are not simply counted twice."><ValueLayerChart result={result} /></Card>
        <Card label="Model narrative" title="Why this scenario moved"><div className="stack stack--tight">{result.explanation.map((x) => <p className="meta" key={x}>• {x}</p>)}</div></Card>
      </div>
    </>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string | number; onChange: (value: string) => void; children: ReactNode }) {
  return <div className="field"><label className="field__label">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)}>{children}</select></div>;
}
function RangeField({ label, value, min, max, step = 1, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (n: number) => void }) {
  return <div className="field"><label className="field__label"><span>{label}</span><strong>{value}{suffix}</strong></label><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></div>;
}

function InputsPanel({ inputs, patch }: { inputs: VopInputs; patch: (next: Partial<VopInputs>) => void }) {
  return (
    <div className="stack">
      <SelectField label="Executive value band" value={inputs.executiveBand} onChange={(v) => patch({ executiveBand: v as VopInputs['executiveBand'] })}><option value="vp">VP / Sr Director · ~$250K</option><option value="svp">SVP / MD · ~$400K</option><option value="csuite">C-Suite · ~$650K</option><option value="elite">CEO / Board · ~$1.2M</option></SelectField>
      <RangeField label="Journey legs" value={inputs.totalLegs} min={3} max={16} onChange={(n) => patch({ totalLegs: n })} />
      <RangeField label="Ground legs" value={inputs.groundLegs} min={1} max={12} onChange={(n) => patch({ groundLegs: n })} />
      <RangeField label="Flight segments" value={inputs.flightSegments} min={1} max={6} onChange={(n) => patch({ flightSegments: n })} />
      <RangeField label="Meeting criticality" value={inputs.criticality} min={0} max={100} suffix="/100" onChange={(n) => patch({ criticality: n })} />
      <RangeField label="Protected arrival buffer" value={inputs.arrivalBufferMinutes} min={0} max={180} step={5} suffix="m" onChange={(n) => patch({ arrivalBufferMinutes: n })} />
      <RangeField label="Material disruption probability" value={Math.round(inputs.disruptionProbability * 100)} min={2} max={60} suffix="%" onChange={(n) => patch({ disruptionProbability: n / 100 })} />
      <RangeField label="Recovery burden" value={inputs.recoveryMinutes} min={30} max={240} step={5} suffix="m" onChange={(n) => patch({ recoveryMinutes: n })} />
      <SelectField label="Trip complexity" value={inputs.complexity} onChange={(v) => patch({ complexity: v as VopInputs['complexity'] })}><option value="routine">Routine</option><option value="coordinated">Coordinated</option><option value="complex">Complex</option><option value="mission">Mission-critical</option></SelectField>
      <SelectField label="Consequence of failure" value={inputs.consequence} onChange={(v) => patch({ consequence: v as VopInputs['consequence'] })}><option value="internal">Internal meeting</option><option value="client">Client meeting</option><option value="keynote">Keynote</option><option value="board">Board meeting</option><option value="transaction">Transaction-critical</option></SelectField>
      <SelectField label="Automation coverage" value={inputs.automation} onChange={(v) => patch({ automation: v as VopInputs['automation'] })}><option value="booking">Booking only</option><option value="coordination">Journey coordination</option><option value="proactive">Proactive disruption</option><option value="full">Full orchestration</option></SelectField>
      <RangeField label="Providers / apps" value={inputs.providers} min={1} max={10} onChange={(n) => patch({ providers: n })} />
      <RangeField label="Stakeholders" value={inputs.stakeholders} min={1} max={12} onChange={(n) => patch({ stakeholders: n })} />
      <RangeField label="Trips per year" value={inputs.annualTrips} min={1} max={80} onChange={(n) => patch({ annualTrips: n })} />
      <RangeField label="Executives in program" value={inputs.executives} min={1} max={50} onChange={(n) => patch({ executives: n })} />
    </div>
  );
}

function ScenarioLab({ inputs, result, patch }: { inputs: VopInputs; result: VopResult; patch: (next: Partial<VopInputs>) => void }) {
  const toggleChaos = (key: ChaosKey) => patch({ chaos: inputs.chaos.includes(key) ? inputs.chaos.filter((x) => x !== key) : [...inputs.chaos, key] });
  const stateData = result.states.map((s) => ({ name: s.label, protected: s.valueProtected, risk: s.valueAtRisk, residual: s.residualExposure }));
  return (
    <>
      <PageHead eyebrow="Scenario Lab" title="Stress-test the journey" lede="Change the assumptions, then introduce real travel failures. Every card and chart is recalculated against the same deterministic VOP model." action={<Badge tone={inputs.chaos.length ? 'negative' : 'positive'}>{inputs.chaos.length ? `${inputs.chaos.length} chaos events active` : 'No chaos events'}</Badge>} />
      <div className="grid grid--wide-left">
        <Card label="Scenario states" title="Routine → Elevated → Disrupted"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stateData}><defs><linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d4af37" stopOpacity={0.35}/><stop offset="95%" stopColor="#d4af37" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" /><XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,.6)' }} /><YAxis tick={{ fill: 'rgba(255,255,255,.48)' }} tickFormatter={(v) => `$${Math.round(v)}`} /><Tooltip formatter={(v) => money(Number(v))} contentStyle={{ background: '#030507', border: '1px solid rgba(255,255,255,.11)', borderRadius: 10 }} /><Legend /><Area type="monotone" dataKey="protected" name="Value Protected" stroke="#f1cf69" fill="url(#goldFill)" strokeWidth={3}/><Area type="monotone" dataKey="risk" name="Value at Risk" stroke="#e0665e" fill="transparent" strokeWidth={2}/></AreaChart></ResponsiveContainer></div></Card>
        <Card label="Inputs" title="Assumptions"><InputsPanel inputs={inputs} patch={patch} /></Card>
      </div>
      <Card label="Chaos Toggles" title="What happens if…" className="card--risk section" hint="These are scenario controls, not live operational alerts. They deliberately amplify the underlying coordination and dependency model.">
        <div className="chaos-grid">{CHAOS_OPTIONS.map((item) => <button key={item.key} className="chaos-toggle" aria-pressed={inputs.chaos.includes(item.key)} onClick={() => toggleChaos(item.key)}><span className="chaos-toggle__title"><span className="chaos-toggle__mark">{inputs.chaos.includes(item.key) ? '●' : '○'}</span>{item.label}</span><span className="chaos-toggle__detail">{item.detail}</span></button>)}</div>
      </Card>
      <div className="grid grid--4 section"><StatCard label="Value protected" value={money(result.valueProtected)} caption="Current scenario" tone="gold"/><StatCard label="Value at risk" value={money(result.valueAtRisk)} caption="Current scenario"/><StatCard label="Residual exposure" value={money(result.residualExposure)} caption="After selected automation"/><StatCard label="Estimated ROI" value={pct(result.estimatedRoiPct)} caption={`At ${money(inputs.platformFee)} modeled price`} tone="positive"/></div>
    </>
  );
}

function JourneyEconomics({ inputs, result }: { inputs: VopInputs; result: VopResult }) {
  const nodes = useMemo(() => {
    const items: { name: string; detail: string; exposure: number }[] = [{ name: 'HOME', detail: 'Journey origin', exposure: result.components.attention * 0.08 }];
    const perGround = result.components.coordination / Math.max(1, inputs.groundLegs);
    const perFlight = (result.components.continuity + result.components.mission) / Math.max(1, inputs.flightSegments);
    for (let i = 0; i < Math.max(inputs.flightSegments, inputs.groundLegs); i++) {
      if (i < inputs.groundLegs) items.push({ name: `Ground ${String(i + 1).padStart(2, '0')}`, detail: i === 1 ? `${inputs.arrivalBufferMinutes}m protected buffer` : 'Movement dependency', exposure: perGround });
      if (i < inputs.flightSegments) items.push({ name: `Flight ${String(i + 1).padStart(2, '0')}`, detail: 'Air continuity dependency', exposure: perFlight });
      if (i === 1) items.push({ name: 'MEETING', detail: `${inputs.criticality}/100 criticality`, exposure: result.components.mission });
    }
    items.push({ name: 'HOME', detail: 'Journey complete', exposure: result.residualExposure * 0.1 });
    return items.slice(0, 16);
  }, [inputs, result]);
  return (
    <>
      <PageHead eyebrow="Journey Economics" title="Travel is a chain of dependencies" lede="See where economic exposure sits across the movement chain instead of treating the trip as one undifferentiated booking." />
      <Card label="Journey map" title="Modeled dependency chain"><div className="journey">{nodes.map((n, i) => <div className="row" style={{ flexWrap: 'nowrap' }} key={`${n.name}-${i}`}><div className="journey__node"><strong>{n.name}</strong><div className="figure figure--sm">{money(n.exposure)}</div><span>{n.detail}</span></div>{i < nodes.length - 1 ? <div className="journey__arrow">→</div> : null}</div>)}</div></Card>
      <div className="grid grid--3 section"><StatCard label="Journey legs" value={`${inputs.totalLegs}`} caption={`${inputs.flightSegments} air · ${inputs.groundLegs} ground`} /><StatCard label="Dependencies" value={`${inputs.providers + inputs.stakeholders}`} caption={`${inputs.providers} providers · ${inputs.stakeholders} stakeholders`} /><StatCard label="Residual exposure" value={money(result.residualExposure)} caption="Economic exposure that remains" tone="ice" /></div>
    </>
  );
}

function ValueAnatomy({ inputs, result }: { inputs: VopInputs; result: VopResult }) {
  const max = Math.max(...Object.values(result.components));
  const rows = [
    ['Executive Attention', result.components.attention, `${result.manualMinutes}m manual · ${result.goaiMinutes}m GÖ.AI · ${result.timeReturnedMinutes}m returned`, ''],
    ['Coordination', result.components.coordination, `${inputs.totalLegs} legs · ${inputs.providers} providers · ${result.touchesRemoved} touches removed`, 'ice'],
    ['Continuity', result.components.continuity, `${Math.round(inputs.disruptionProbability * 100)}% base disruption exposure · ${inputs.recoveryMinutes}m recovery`, 'intel'],
    ['Mission', result.components.mission, `${inputs.criticality}/100 criticality · ${inputs.arrivalBufferMinutes}m protected buffer`, 'positive'],
  ] as const;
  return (
    <>
      <PageHead eyebrow="Value Anatomy" title="Where the value comes from" lede="Decompose VOP into attention, coordination, continuity, and mission value so the headline result remains explainable." />
      <div className="grid grid--2">{rows.map(([name, value, detail, tone]) => <Card key={name} label={name} className={name === 'Executive Attention' ? 'card--accent' : ''}><div className="figure">{money(value)}</div><p className="meta" style={{ marginTop: 10 }}>{detail}</p><div className={`metric-bar ${tone ? `metric-bar--${tone}` : ''}`}><span className="meta">Share of peak</span><div className="metric-bar__track"><div className="metric-bar__fill" style={{ width: `${Math.max(5, (value / max) * 100)}%` }} /></div><span className="num">{Math.round((value / Math.max(1, result.valueProtected)) * 100)}%</span></div></Card>)}</div>
    </>
  );
}

function Compare({ inputs, result }: { inputs: VopInputs; result: VopResult }) {
  const fragmentedMinutes = result.manualMinutes;
  const managedMinutes = Math.round(fragmentedMinutes * 0.49);
  const goaiMinutes = result.goaiMinutes;
  const managedValue = result.valueProtected * 0.43;
  return (
    <>
      <PageHead eyebrow="Compare" title="Operating model comparison" lede="Compare fragmented, managed, and orchestrated travel without making unsupported competitor-specific claims." />
      <Card label="Operating models" title="Same trip, different coordination model"><div className="table-wrap"><table className="data"><thead><tr><th>Measure</th><th>Fragmented</th><th>Managed</th><th>GÖ.AI Orchestrated</th></tr></thead><tbody><tr><td>Active coordination</td><td>{fragmentedMinutes}m</td><td>{managedMinutes}m</td><td>{goaiMinutes}m</td></tr><tr><td>Manual touchpoints</td><td>{Math.round(result.touchesRemoved / 0.9)}</td><td>{Math.round(result.touchesRemoved * 0.55)}</td><td>{Math.max(1, Math.round(result.touchesRemoved * 0.1))}</td></tr><tr><td>Systems traversed</td><td>{inputs.providers}</td><td>{Math.max(2, Math.ceil(inputs.providers * 0.6))}</td><td>1 journey layer</td></tr><tr><td>Disruption burden</td><td>High</td><td>Medium</td><td>Reduced / coordinated</td></tr><tr><td>Estimated value retained</td><td>—</td><td>{money(managedValue)}</td><td><strong>{money(result.valueProtected)}</strong></td></tr></tbody></table></div></Card>
      <div className="grid grid--3 section"><StatCard label="Time differential" value={minutes(fragmentedMinutes - goaiMinutes)} caption="Fragmented vs orchestrated"/><StatCard label="Value differential" value={money(result.valueProtected - managedValue)} caption="Orchestrated vs managed model" tone="gold"/><StatCard label="Automation coverage" value={inputs.automation.toUpperCase()} caption="Selected GÖ.AI responsibility level"/></div>
    </>
  );
}

function downloadCreatorCard(inputs: VopInputs, result: VopResult, scenarioName: string) {
  const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 900;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const grad = ctx.createLinearGradient(0, 0, 1600, 900); grad.addColorStop(0, '#030507'); grad.addColorStop(1, '#0b0f15'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 1600, 900);
  ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2; ctx.strokeRect(36, 36, 1528, 828);
  ctx.fillStyle = '#f1cf69'; ctx.font = '600 42px Arial'; ctx.fillText('GÖ.AI VOP™', 92, 120);
  ctx.fillStyle = '#a8acb4'; ctx.font = '28px Arial'; ctx.fillText(scenarioName.toUpperCase(), 92, 188);
  ctx.fillStyle = '#ffffff'; ctx.font = '700 132px Arial'; ctx.fillText(`${money(result.valueProtectedLow)}–${money(result.valueProtectedHigh)}`, 92, 430);
  ctx.fillStyle = '#d7d9dd'; ctx.font = '34px Arial'; ctx.fillText('ESTIMATED VALUE PROTECTED', 98, 488);
  ctx.fillStyle = '#a8acb4'; ctx.font = '28px Arial'; ctx.fillText(`${inputs.totalLegs} travel legs · ${inputs.criticality}/100 criticality · ${inputs.disruptionExposure} disruption exposure`, 98, 600);
  ctx.fillStyle = '#f1cf69'; ctx.font = '600 40px Arial'; ctx.fillText(`${result.vopMultiple.toFixed(1)}× VOP · ${pct(result.estimatedRoiPct)} estimated ROI`, 98, 672);
  ctx.fillStyle = '#777d87'; ctx.font = '26px Arial'; ctx.fillText('Travel is a chain of dependencies.', 98, 780);
  const a = document.createElement('a'); a.download = 'goai-vop-scenario.png'; a.href = canvas.toDataURL('image/png'); a.click();
}

function Creator({ inputs, result, patch }: { inputs: VopInputs; result: VopResult; patch: (next: Partial<VopInputs>) => void }) {
  const [scenarioName, setScenarioName] = useState('Six-Leg Standard Business Trip');
  const [message, setMessage] = useState('');
  const loadPreset = (name: string) => { setScenarioName(name); patch({ ...DEFAULT_INPUTS, ...PRESETS[name] }); };
  const copy = async (text: string, ok: string) => { await navigator.clipboard.writeText(text); setMessage(ok); window.setTimeout(() => setMessage(''), 1800); };
  const caption = `What is fragmented executive travel actually costing? I modeled “${scenarioName}” in GÖ.AI VOP™ Studio: ${money(result.valueProtectedLow)}–${money(result.valueProtectedHigh)} estimated value protected, ${result.vopMultiple.toFixed(1)}× VOP and ${pct(result.estimatedRoiPct)} estimated ROI. Travel is a chain of dependencies.`;
  return (
    <>
      <PageHead eyebrow="Creator Mode" title="Turn scenarios into shareable economics" lede="Load a recognizable business-travel scenario, stress it, then generate a visual, caption, or shareable link without exposing the server-side model weights." action={message ? <Badge tone="positive">✓ {message}</Badge> : <Badge tone="gold">Creator-ready</Badge>} />
      <div className="grid grid--wide-left">
        <div className="creator-card"><div><div className="creator-card__brand">GÖ.AI VOP™</div><div className="creator-card__scenario" style={{ marginTop: 14 }}>{scenarioName}</div></div><div><div className="creator-card__value">{money(result.valueProtectedLow)}–{money(result.valueProtectedHigh)}</div><div className="muted">ESTIMATED VALUE PROTECTED</div><div className="row" style={{ marginTop: 18 }}><Badge tone="gold">{result.vopMultiple.toFixed(1)}× VOP</Badge><Badge tone="positive">{pct(result.estimatedRoiPct)} estimated ROI</Badge><Badge tone="ice">{inputs.totalLegs} legs</Badge></div></div><div className="creator-card__footer"><span>Travel is a chain of dependencies.</span><span>GÖ.AI</span></div></div>
        <Card label="Scenario presets" title="Load a story people understand"><div className="preset-grid">{Object.keys(PRESETS).map((name) => <button key={name} className="preset" onClick={() => loadPreset(name)}><strong>{name}</strong><span className="meta" style={{ display: 'block', marginTop: 5 }}>Load scenario →</span></button>)}</div></Card>
      </div>
      <Card label="Distribution tools" title="Share the scenario" className="section"><div className="row"><button className="btn btn--gold" onClick={() => downloadCreatorCard(inputs, result, scenarioName)}>Download 16:9 card</button><button className="btn" onClick={() => void copy(caption, 'Caption copied')}>Copy LinkedIn caption</button><button className="btn" onClick={() => void copy(encodeScenario(inputs), 'Scenario link copied')}>Copy scenario link</button><button className="btn btn--ghost" onClick={() => { setScenarioName('Six-Leg Standard Business Trip'); patch(DEFAULT_INPUTS); }}>Reset</button></div><p className="meta" style={{ marginTop: 14 }}>{caption}</p></Card>
    </>
  );
}

function Analyst({ inputs, result }: { inputs: VopInputs; result: VopResult }) {
  const top = Object.entries(result.components).sort((a, b) => b[1] - a[1])[0];
  const suggestions = [
    inputs.arrivalBufferMinutes < 45 ? 'Increase the protected arrival buffer; this scenario is operating with compressed schedule resilience.' : 'The current arrival buffer is comparatively healthy; focus on provider and disruption dependencies next.',
    inputs.chaos.includes('cancelled') ? 'With cancellation active, recovery coordination dominates. Earlier alternatives and downstream ground/hotel holds create the biggest modeled protection.' : 'Run the flight-cancellation Chaos Toggle to see the nonlinear value of coordinated recovery.',
    inputs.automation !== 'full' ? 'Increase automation coverage to see how much additional exposure can be protected when GÖ.AI owns more of the journey chain.' : 'Full orchestration is already selected, so the remaining exposure is mostly irreducible trip risk rather than coordination burden.',
  ];
  return (
    <>
      <PageHead eyebrow="VOP Analyst" title="Explain the economics" lede="This first version interprets deterministic model outputs without letting an LLM invent the VOP calculation." action={<Badge tone="intel">◆ Deterministic interpretation</Badge>} />
      <div className="grid grid--wide-left"><Card label="Analysis" title={`Why this trip is worth ${money(result.valueProtected)}`}><p className="muted">The largest modeled contribution is <strong>{top[0]}</strong> at <strong>{money(top[1])}</strong>. The current scenario returns {result.timeReturnedMinutes} minutes of active coordination, removes about {result.touchesRemoved} manual touches, and leaves {money(result.residualExposure)} of residual exposure after the selected automation level.</p><div className="stack stack--tight">{suggestions.map((x) => <p key={x} className="meta">• {x}</p>)}</div></Card><HeroValue result={result} /></div>
    </>
  );
}

function Methodology({ inputs, result }: { inputs: VopInputs; result: VopResult }) {
  return (
    <>
      <PageHead eyebrow="Methodology" title="Auditable without exposing the moat" lede="Public inputs and outputs stay explainable while proprietary weights, caps, normalization, and disruption coefficients remain server-side." />
      <div className="grid grid--2"><Card label="Public model" title="What users can understand"><div className="stack stack--tight"><p className="meta">VOP = Attention Value + Coordination Value + Continuity Value + Mission Value, with overlap controls.</p><p className="meta">Value-to-Price = Value Protected ÷ modeled platform price.</p><p className="meta">Estimated ROI = (Value Protected − Price) ÷ Price.</p><p className="meta">Headline results are shown as ranges to avoid false precision.</p></div></Card><Card label="Protected model policy" title="What remains server-side" className="card--intel"><div className="stack stack--tight"><p className="meta">Compensation normalization and hourly-value mapping</p><p className="meta">Complexity, consequence, continuity, and automation coefficients</p><p className="meta">Overlap normalization and mission-value caps</p><p className="meta">Chaos-event severity and recovery adjustments</p><p className="meta">Model version: {result.modelVersion}</p></div></Card></div>
      <div className="grid grid--4 section"><StatCard label="Hourly value proxy" value={money(result.hourlyValue)} caption="Compensation-derived modeling input"/><StatCard label="Manual baseline" value={`${result.manualMinutes}m`} caption="Scenario-derived coordination time"/><StatCard label="GÖ.AI interaction" value={`${result.goaiMinutes}m`} caption="Modeled active interaction" tone="ice"/><StatCard label="Platform fee" value={money(inputs.platformFee)} caption="Used for VOP and estimated ROI" tone="gold"/></div>
    </>
  );
}

export function App() {
  const location = useLocation();
  const [inputs, setInputs] = useState<VopInputs>(() => {
    if (location.pathname === '/creator') {
      const shared = decodeScenario(new URLSearchParams(location.search).get('s'));
      if (shared) return shared;
    }
    return DEFAULT_INPUTS;
  });
  const [result, setResult] = useState<VopResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const patch = (next: Partial<VopInputs>) => setInputs((current) => ({ ...current, ...next }));

  useEffect(() => {
    let alive = true;
    setBusy(true);
    const handle = window.setTimeout(() => {
      calculateVop(inputs)
        .then((next) => { if (alive) { setResult(next); setError(''); } })
        .catch((err: unknown) => { if (alive) setError(err instanceof Error ? err.message : 'VOP calculation failed'); })
        .finally(() => { if (alive) setBusy(false); });
    }, 180);
    return () => { alive = false; window.clearTimeout(handle); };
  }, [inputs]);

  return (
    <Shell busy={busy}>
      {error ? <div className="error">{error}</div> : null}
      {!result ? <div className="loading">Building VOP model…</div> : (
        <Routes>
          <Route path="/" element={<Overview inputs={inputs} result={result} />} />
          <Route path="/scenario" element={<ScenarioLab inputs={inputs} result={result} patch={patch} />} />
          <Route path="/journey" element={<JourneyEconomics inputs={inputs} result={result} />} />
          <Route path="/anatomy" element={<ValueAnatomy inputs={inputs} result={result} />} />
          <Route path="/compare" element={<Compare inputs={inputs} result={result} />} />
          <Route path="/creator" element={<Creator inputs={inputs} result={result} patch={patch} />} />
          <Route path="/analyst" element={<Analyst inputs={inputs} result={result} />} />
          <Route path="/methodology" element={<Methodology inputs={inputs} result={result} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Shell>
  );
}
