import React, { CSSProperties, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { X } from 'lucide-react';
import { useAppContext } from '../../app/store';
import { useAnalyticsQuery } from '../../api/hooks';
import { getCurrentQuarter } from '../../shared/utils';
import { Quarter } from '../../shared/types';
import { analyticsKindLabels, analyticsQueryParams, analyticsStatusLabel, latestInitiativeRecords, quarterlyDepartmentReserve, recordsByIds, statusCardIds } from './analyticsSelectors';
import { AnalyticsFilters, AnalyticsMode, AnalyticsRecord, AnalyticsResponse } from './analyticsTypes';
import styles from './Dashboard.module.css';
import { SYSTEM_MESSAGES } from '../../shared/constants/systemMessages';

const statusOrder = ['GREEN', 'YELLOW', 'RED', 'DEFAULT'] as const;
const statusFallback: Record<string, string> = { GREEN: '#22c55e', YELLOW: '#f59e0b', RED: '#ef4444', DEFAULT: '#94a3b8' };
const riskLabels: Record<string, string> = { NO_MANAGER: 'Без менеджера', NO_PRIORITY: 'Без пріоритету', NO_SCOPE: 'Без scope', NO_EXECUTOR: 'Без виконавця', INCOMPLETE_PREPARATION: 'Підготовчий етап заповнений не повністю' };
const tooltipStyle = { borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgb(15 23 42 / 10%)', fontSize: 12 };
type Drilldown = { title: string; records: AnalyticsRecord[] } | null;

export const Dashboard = () => {
  const { departments, managers, initiativeStatuses, setInitiativeDataScope } = useAppContext();
  useEffect(() => { setInitiativeDataScope({ mode: 'dashboard' }); }, [setInitiativeDataScope]);
  const now = new Date();
  const [mode, setMode] = useState<AnalyticsMode>('quarterly');
  const [filters, setFilters] = useState<AnalyticsFilters>({ year: now.getFullYear(), quarter: getCurrentQuarter(), kind: 'ALL', departmentId: '', managerId: '' });
  const [drilldown, setDrilldown] = useState<Drilldown>(null);
  const params = useMemo(() => {
    const result = analyticsQueryParams(filters);
    if (mode === 'quarterly') result.set('quarter', filters.quarter);
    return result;
  }, [filters, mode]);
  const analytics = useAnalyticsQuery(mode, params);
  const data = analytics.data;
  const kindLabels = analyticsKindLabels(filters.kind);
  const statusDefinition = (code: string) => initiativeStatuses.find((item) => item.code === code);
  const openRecords = (title: string, ids?: string[]) => setDrilldown({ title, records: recordsByIds(data, ids) });
  const update = <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const years = Array.from(new Set([...(data?.available_years ?? []), filters.year, now.getFullYear()])).sort((a, b) => a - b);
  const statusData = statusOrder.map((code) => ({ code, name: analyticsStatusLabel(code), value: data?.status_counts[code] ?? 0, color: statusDefinition(code)?.color ?? statusFallback[code] })).filter((item) => item.value);
  const scopeData = statusOrder.map((code) => ({ name: analyticsStatusLabel(code), value: data?.scope_status_counts[code] ?? 0, color: statusDefinition(code)?.color ?? statusFallback[code] }));
  const summary = data?.summary ?? { cards: 0, initiatives: 0, total_weight: 0, average_progress: 0, average_duration: 0, overloaded_departments: 0 };
  const activeDepartments = departments.filter((department) => department.is_active !== false && (!filters.departmentId || department.id === filters.departmentId));
  const preparationDrilldown = () => data && setDrilldown({
    title: 'Підготовчі етапи без квартальної картки',
    records: data.preparation.records.map((item) => ({
      id: item.id, initiative_id: item.initiative_id, kind: item.kind as AnalyticsRecord['kind'], name: item.name,
      year: item.year, quarter: 'Q1', manager_id: item.manager_id, manager_name: managers.find((manager) => manager.id === item.manager_id)?.name ?? null,
      priority_id: item.priority_id, priority_name: null, department_ids: item.department_ids, status_code: 'DEFAULT', total_weight: 0,
      size_name: 'Підготовчий етап', progress: item.ready ? 100 : 0, scope_items: 0, risks: item.ready ? [] : ['INCOMPLETE_PREPARATION'],
    })),
  });

  return <div className={styles.dashboard}>
    <section className={styles.toolbar}>
      <div className={styles.switch}>
        {([['quarterly', 'Квартальний'], ['annual', 'Річний']] as const).map(([id, title]) => <button key={id} onClick={() => { setMode(id); setDrilldown(null); }} className={`${styles.switchButton} ${mode === id ? styles.switchActive : ''}`}>{title}</button>)}
      </div>
      <div className={styles.filters}>
        <select value={filters.kind} onChange={(event) => update('kind', event.target.value as AnalyticsFilters['kind'])} className={styles.select}><option value="ALL">Проєкти + операційні задачі</option><option value="PROJECT">Тільки проєкти</option><option value="OPERATIONAL_TASK">Тільки операційні задачі</option></select>
        <select value={filters.year} onChange={(event) => update('year', Number(event.target.value))} className={styles.select}>{years.map((year) => <option key={year}>{year}</option>)}</select>
        {mode === 'quarterly' && <select value={filters.quarter} onChange={(event) => update('quarter', event.target.value as Quarter)} className={styles.select}>{(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map((quarter) => <option key={quarter}>{quarter}</option>)}</select>}
        <select value={filters.departmentId} onChange={(event) => update('departmentId', event.target.value)} className={styles.select}><option value="">Всі підрозділи</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select value={filters.managerId} onChange={(event) => update('managerId', event.target.value)} className={styles.select}><option value="">Всі менеджери</option>{managers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>
      <p className={styles.filterNote}>{mode === 'quarterly' ? `Усі показники використовують тільки ${filters.quarter} ${filters.year} року.` : 'Статус, розмір і прогрес визначаються за останньою карткою року; навантаження — сума Q1–Q4.'}</p>
    </section>

    {analytics.isPending && <div className={styles.loading}>Завантаження аналітики…</div>}
    {analytics.isError && <div className={styles.error}>{SYSTEM_MESSAGES.loading.analyticsFailed}</div>}
    {data && <>
      <div className={styles.kpiGrid}>
        <Kpi title="Квартальні картки" value={summary.cards} accent="#0f766e" onClick={() => openRecords('Квартальні картки')} />
        <Kpi title={`Унікальні ${kindLabels.nominative}`} value={summary.initiatives} accent="#4f46e5" onClick={() => setDrilldown({ title: kindLabels.nominativeTitle, records: latestInitiativeRecords(data) })} />
        <Kpi title="Загальна вага" value={summary.total_weight} accent="#d97706" onClick={() => openRecords('Картки, що формують вагу')} />
        <Kpi title="Середній прогрес" value={`${summary.average_progress}%`} accent="#6366f1" progress={summary.average_progress} onClick={() => openRecords('Картки, що формують прогрес')} />
        <Kpi title={mode === 'annual' ? 'Середня тривалість' : 'Перевантажено підрозділів'} value={mode === 'annual' ? `${summary.average_duration} кв.` : summary.overloaded_departments} accent={mode === 'annual' ? '#7c3aed' : summary.overloaded_departments ? '#e11d48' : '#059669'} />
      </div>

      <div className={styles.grid12}>
        <Chart title={`Статус ${kindLabels.genitive}`} className={styles.span4}>
          {statusData.length ? <ResponsiveContainer width="100%" height={270}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={78} paddingAngle={4} onClick={(entry: any) => openRecords(`Статус: ${entry.name ?? entry.payload?.name}`, statusCardIds(data, entry.code ?? entry.payload?.code))}>{statusData.map((item) => <Cell key={item.code} fill={item.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer> : <Empty />}
        </Chart>
        <Chart title="Статус scope-завдань" className={styles.span4}><ResponsiveContainer width="100%" height={270}><BarChart data={scopeData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" name="Завдань" radius={[5, 5, 0, 0]} onClick={() => openRecords('Картки, що формують статуси scope')}>{scopeData.map((item) => <Cell key={item.name} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer></Chart>
        <Chart title={`Розподіл ${kindLabels.genitive} за розміром`} className={styles.span4}><ResponsiveContainer width="100%" height={270}><BarChart data={data.size_breakdown} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={105} tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name={kindLabels.genitiveTitle} fill="#8b5cf6" radius={[0, 5, 5, 0]} onClick={(entry: any) => openRecords(`Розмір: ${entry.name ?? entry.payload?.name}`, entry.card_ids ?? entry.payload?.card_ids)} /></BarChart></ResponsiveContainer></Chart>
      </div>

      {mode === 'annual' && <div className={styles.grid2}>
        <Chart title={`Динаміка ${kindLabels.genitive} за кварталами`}><ResponsiveContainer width="100%" height={285}><LineChart data={data.quarter_trend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="quarter" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Legend /><Line dataKey="cards" name="Картки" stroke="#6366f1" strokeWidth={3} /><Line dataKey="initiatives" name={kindLabels.nominativeTitle} stroke="#10b981" strokeWidth={2} /></LineChart></ResponsiveContainer></Chart>
        <Chart title="Історична динаміка статусів"><ResponsiveContainer width="100%" height={285}><BarChart data={data.history}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="year" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} />{statusOrder.map((code) => <Bar key={code} dataKey={`status_counts.${code}`} name={analyticsStatusLabel(code)} stackId="status" fill={statusDefinition(code)?.color ?? statusFallback[code]} />)}</BarChart></ResponsiveContainer></Chart>
      </div>}

      <div className={styles.grid2}>
        <Chart title={mode === 'annual' ? 'Річне навантаження підрозділів' : `Навантаження підрозділів у ${filters.quarter}`} description="Фактичне навантаження порівняно з доступним лімітом."><ResponsiveContainer width="100%" height={310}><BarChart data={data.department_capacity}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" angle={-28} textAnchor="end" height={78} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Legend /><Bar dataKey="load" name="Навантаження" fill="#6366f1" radius={[5, 5, 0, 0]} /><Bar dataKey="limit" name="Ліміт" fill="#cbd5e1" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></Chart>
        <Chart title="Топ менеджерів за вагою"><ManagerCards data={data} onOpen={openRecords} /></Chart>
      </div>

      <Chart title="Резерв завантаження" description={mode === 'annual' ? 'Для кожного активного підрозділу показано навантаження і резерв окремо за Q1–Q4.' : `Усі активні підрозділи: навантаження та резерв до ліміту за ${filters.quarter}.`} badge={`Перевантажено: ${summary.overloaded_departments}`}>
        <ReserveWidget data={data} mode={mode} quarter={filters.quarter} departments={activeDepartments} />
      </Chart>

      {mode === 'annual' && <div className={styles.grid12}>
        <Chart title="Теплова карта Q1–Q4" description="Зелений — норма, жовтий — від 80%, червоний — перевищення." className={styles.span8}><CapacityTable data={data.capacity_by_quarter} departments={activeDepartments} /></Chart>
        <Chart title="Готовність PreparationStage" className={styles.span4}><button onClick={preparationDrilldown} className={styles.preparation}><div className={styles.preparationValue}>{data.preparation.ready}/{data.preparation.total}</div><p className={styles.preparationText}>готових етапів без квартальної картки</p><span className={styles.link}>Переглянути записи →</span></button></Chart>
      </div>}

      <div className={styles.grid2}>
        <Chart title="Пріоритети за сумарною вагою"><ResponsiveContainer width="100%" height={285}><BarChart data={data.priority_breakdown} layout="vertical" margin={{ right: 24 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={135} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="total_weight" name="Вага" fill="#f59e0b" radius={[0, 5, 5, 0]} onClick={(entry: any) => openRecords(`Пріоритет: ${entry.name ?? entry.payload?.name}`, entry.card_ids ?? entry.payload?.card_ids)} /></BarChart></ResponsiveContainer></Chart>
        <Chart title="Контроль плану" badge={String(data.risks.length)}><div className={styles.riskList}>{data.risks.length ? data.risks.map((risk) => <button key={risk.id} onClick={() => openRecords('Планувальний ризик', [risk.id])} className={styles.risk}><span className={styles.riskName}>{risk.name}</span><span className={styles.riskText}>{risk.risks.map((item) => riskLabels[item] ?? item).join(' · ')}</span></button>) : <Empty />}</div></Chart>
      </div>
    </>}
    {drilldown && <DrilldownModal value={drilldown} onClose={() => setDrilldown(null)} />}
  </div>;
};

const Kpi = ({ title, value, accent, progress, onClick }: { title: string; value: string | number; accent: string; progress?: number; onClick?: () => void }) => {
  const Tag = onClick ? 'button' : 'div';
  return <Tag onClick={onClick} className={styles.kpi} style={{ '--accent': accent } as CSSProperties}><div className={styles.kpiLabel}>{title}</div><div className={styles.kpiValue}>{value}</div>{progress !== undefined && <div className={styles.kpiTrack}><div className={styles.kpiTrackFill} style={{ width: `${Math.min(progress, 100)}%` }} /></div>}{onClick && <span className={styles.kpiHint}>Деталі →</span>}</Tag>;
};
const Chart = ({ title, description, badge, children, className = '' }: React.PropsWithChildren<{ title: string; description?: string; badge?: string; className?: string }>) => <section className={`${styles.panel} ${className}`}><header className={styles.panelHeader}><div><h3 className={styles.panelTitle}>{title}</h3>{description && <p className={styles.panelDescription}>{description}</p>}</div>{badge && <span className={styles.badge}>{badge}</span>}</header>{children}</section>;
const Empty = () => <div className={styles.empty}>Немає даних</div>;

const ManagerCards = ({ data, onOpen }: { data: AnalyticsResponse; onOpen: (title: string, ids?: string[]) => void }) => data.manager_loads.length ? <div className={styles.managerGrid}>{data.manager_loads.slice(0, 5).map((manager, index) => <button key={manager.manager_id} className={styles.managerCard} onClick={() => onOpen(`Менеджер: ${manager.name}`, manager.card_ids)}><span className={styles.managerRank}>#{index + 1}</span><div className={styles.managerName} title={manager.name}>{manager.name}</div><div className={styles.managerLoad}>{manager.load} <span className={styles.managerUnit}>бал.</span></div></button>)}</div> : <Empty />;

const reserveTone = (load: number, limit: number) => load > limit ? styles.danger : limit > 0 && load / limit >= .8 ? styles.warning : styles.good;
const ReserveWidget = ({ data, mode, quarter, departments }: { data: AnalyticsResponse; mode: AnalyticsMode; quarter: Quarter; departments: Array<{ id: string; name: string }> }) => {
  if (!departments.length) return <Empty />;
  if (mode === 'annual') return <div className={styles.scroll}><div className={styles.quarterReserve}><span />{data.capacity_by_quarter.map((period) => <span key={period.quarter} className={styles.quarterHeader}>{period.quarter}</span>)}</div>{departments.map((department) => <div key={department.id} className={styles.quarterReserve}><span className={styles.departmentName} title={department.name}>{department.name}</span>{data.capacity_by_quarter.map((period) => { const metric = period.departments.find((item) => item.department_id === department.id); const load = metric?.load ?? 0; const limit = metric?.limit ?? 0; const reserve = limit - load; return <div key={period.quarter} className={styles.quarterCell}><div className={styles.quarterLoad}>{load}/{limit}</div><div className={`${styles.quarterReserveValue} ${reserveTone(load, limit)}`}>{reserve < 0 ? `−${Math.abs(reserve)}` : `+${reserve}`} резерв</div></div>; })}</div>)}</div>;
  return <div className={styles.reserveGrid}>{quarterlyDepartmentReserve(data, quarter, departments).map((department) => { const percent = department.limit ? Math.min(department.load / department.limit * 100, 100) : 0; return <article key={department.id} className={styles.reserveCard}><div className={styles.reserveTop}><span className={styles.departmentName} title={department.name}>{department.name}</span><span className={`${styles.reserveValue} ${reserveTone(department.load, department.limit)}`}>{department.reserve < 0 ? `Перевищення ${Math.abs(department.reserve)}` : `Резерв ${department.reserve}`}</span></div><div className={styles.progressTrack}><div className={`${styles.progressFill} ${department.isOverCapacity ? styles.progressDanger : ''}`} style={{ width: `${percent}%` }} /></div><div className={styles.loadMeta}><span>Навантаження {department.load}</span><span>Ліміт {department.limit}</span></div></article>; })}</div>;
};

const CapacityTable = ({ data, departments }: { data: AnalyticsResponse['capacity_by_quarter']; departments: Array<{ id: string; name: string }> }) => <div className={styles.scroll}><div className={styles.quarterReserve}><span />{data.map((item) => <span key={item.quarter} className={styles.quarterHeader}>{item.quarter}</span>)}</div>{departments.map((department) => <div key={department.id} className={styles.quarterReserve}><span className={styles.departmentName}>{department.name}</span>{data.map((period) => { const item = period.departments.find((entry) => entry.department_id === department.id); const load = item?.load ?? 0; const limit = item?.limit ?? 0; return <span key={period.quarter} className={`${styles.quarterCell} ${reserveTone(load, limit)}`}><span className={styles.quarterLoad}>{load}/{limit}</span></span>; })}</div>)}</div>;

const DrilldownModal = ({ value, onClose }: { value: NonNullable<Drilldown>; onClose: () => void }) => createPortal(<div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={styles.modal}><header className={styles.modalHeader}><div><h2 className={styles.modalTitle}>{value.title}</h2><p className={styles.modalCount}>Записів: {value.records.length}</p></div><button onClick={onClose} className={styles.close}><X /></button></header><div className={styles.modalBody}><div className={styles.recordList}>{value.records.map((record) => <article key={record.id} className={styles.record}><div className={styles.recordTop}><div><div className={styles.recordName}>{record.name}</div><div className={styles.recordMeta}>{record.kind === 'PROJECT' ? 'Проєкт' : 'Операційна задача'} · {record.year} · {record.quarter} · {record.manager_name ?? 'Без менеджера'}</div></div><div><div className={styles.recordWeight}>{record.total_weight} бал.</div><div className={styles.recordDetail}>{record.size_name} · прогрес {record.progress}%</div></div></div>{record.risks.length > 0 && <div className={styles.recordRisk}>{record.risks.map((item) => riskLabels[item] ?? item).join(' · ')}</div>}</article>)}{!value.records.length && <Empty />}</div></div></div></div>, document.body);
