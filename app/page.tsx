'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TerminalState,
  Stakeholder,
  SafeNote,
  SafeConversionResponse,
  BSMResponse,
  WaterfallResponse,
} from '@/lib/types';
import {
  DEFAULT_TERMINAL_STATE,
  loadStateFromUrl,
  syncStateToUrl,
  encodeStateToHash,
} from '@/lib/state';
import {
  StartupStage,
  generatePreSeedState,
  generateSeedState,
  generateSeriesAState,
  generateSeriesBState,
} from '@/lib/sample-data';
import {
  TermSheetOffer,
  compareTermSheets,
} from '@/lib/math/term-sheet-duel';
import {
  PlannedHire,
  STANDARD_HIRING_BENCHMARKS,
  calculateOptionPoolRunway,
} from '@/lib/math/option-pool-hiring';
import {
  parseCapTableCsv,
  SAMPLE_CSV_TEMPLATE,
  CsvParseResult,
} from '@/lib/csv-parser';
import { calculateSafeConversion } from '@/lib/math/safe-math';
import { calculateBlackScholes } from '@/lib/math/black-scholes';
import { calculateWaterfall } from '@/lib/math/waterfall-math';
import {
  calculateBenchmarkRecommendation,
  SectorVertical,
  TractionTier,
  GeographyMarket,
  BENCHMARK_SECTORS,
  BENCHMARK_TRACTIONS,
  BENCHMARK_GEOS,
} from '@/lib/benchmarks';
import {
  Share2,
  Check,
  TrendingUp,
  DollarSign,
  Activity,
  Plus,
  Trash2,
  RefreshCw,
  Cpu,
  Layers,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  ExternalLink,
  Download,
  Upload,
  Search,
  Users,
  HelpCircle,
  Sparkles,
  Info,
  Award,
  Wallet,
  ArrowRight,
  FileSpreadsheet,
  FilePlus,
  PieChart,
  Calculator,
  Compass,
  ArrowUpRight,
  Briefcase,
  Lock,
  Swords,
  UserCheck,
  FileText,
  Printer,
  X,
  Scale,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const STAKEHOLDER_PALETTE = [
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#eab308', // yellow
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export default function MorseBridgePage() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<TerminalState>(DEFAULT_TERMINAL_STATE);
  const [currentStage, setCurrentStage] = useState<StartupStage>('seed');
  const [activeTab, setActiveTab] = useState<
    'ledger' | 'safe-creator' | 'round-modeling' | 'term-sheet-duel' | 'option-pool-hiring' | '409a' | 'waterfall' | 'import-export'
  >('ledger');
  const [copied, setCopied] = useState(false);
  const [activeLedgerView, setActiveLedgerView] = useState<'current' | 'safes' | 'diluted'>('current');
  const [viewMode, setViewMode] = useState<'founder' | 'quant'>('founder');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<'All' | 'Common' | 'Preferred'>('All');
  const [showGreeks, setShowGreeks] = useState(false);
  const [showDueDiligenceModal, setShowDueDiligenceModal] = useState(false);
  const [importedSummary, setImportedSummary] = useState<CsvParseResult | null>(null);
  const [pastedCsvText, setPastedCsvText] = useState('');
  const [importMethodTab, setImportMethodTab] = useState<'upload' | 'paste'>('upload');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Auto Benchmark Suggester State
  const [benchmarkSector, setBenchmarkSector] = useState<SectorVertical>('saas');
  const [benchmarkTraction, setBenchmarkTraction] = useState<TractionTier>('early-revenue');
  const [benchmarkGeo, setBenchmarkGeo] = useState<GeographyMarket>('us-standard');
  const [benchmarkAppliedFeedback, setBenchmarkAppliedFeedback] = useState(false);

  // Quick Inline Add SAFE from Ledger
  const [showInlineAddSafe, setShowInlineAddSafe] = useState(false);
  const [inlineSafeName, setInlineSafeName] = useState('Angel Check');
  const [inlineSafeAmount, setInlineSafeAmount] = useState(100_000);
  const [inlineSafeCap, setInlineSafeCap] = useState(10_000_000);
  const [inlineSafeDiscount, setInlineSafeDiscount] = useState(0.20);
  const [inlineSafeType, setInlineSafeType] = useState<'Post-Money' | 'Pre-Money'>('Post-Money');

  // SAFE Creator & Simulator Form State
  const [newSafeName, setNewSafeName] = useState('New Angel / Fund SAFE');
  const [newSafeAmount, setNewSafeAmount] = useState(250_000);
  const [newSafeCap, setNewSafeCap] = useState(10_000_000);
  const [newSafeDiscount, setNewSafeDiscount] = useState(0.20);
  const [newSafeType, setNewSafeType] = useState<'Post-Money' | 'Pre-Money'>('Post-Money');
  const [safeSimAddedFeedback, setSafeSimAddedFeedback] = useState(false);

  // Term Sheet Duel State
  const [offerA, setOfferA] = useState<TermSheetOffer>({
    leadInvestor: 'Benchmark Capital',
    preMoneyValuation: 28_000_000,
    investmentAmount: 7_000_000,
    targetOptionPoolPct: 0.15,
    poolTiming: 'Pre-Money',
  });
  const [offerB, setOfferB] = useState<TermSheetOffer>({
    leadInvestor: 'Founders Fund',
    preMoneyValuation: 26_000_000,
    investmentAmount: 6_500_000,
    targetOptionPoolPct: 0.10,
    poolTiming: 'Post-Money',
  });

  // Hiring & Option Pool Runway State
  const [plannedHires, setPlannedHires] = useState<PlannedHire[]>([
    { id: 'h-1', role: 'VP of Engineering', equityPct: 1.25 },
    { id: 'h-2', role: 'Principal Architect / Staff Eng', equityPct: 0.35 },
    { id: 'h-3', role: 'Lead Product Designer', equityPct: 0.40 },
    { id: 'h-4', role: 'Senior Software Engineer', equityPct: 0.18 },
  ]);

  // Quant Engine State is computed synchronously below via useMemo (Zero async loops, zero blinking)

  // Initialize from URL on mount
  useEffect(() => {
    setMounted(true);
    const loadedState = loadStateFromUrl();
    setState(loadedState);
  }, []);

  // Sync state to URL hash
  useEffect(() => {
    if (!mounted) return;
    syncStateToUrl(state);
  }, [state, mounted]);

  const handleCopyLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    const hash = encodeStateToHash(state);
    const url = `${window.location.origin}${window.location.pathname}#state=${hash}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [state]);

  // Derived metrics
  const totalIssuedShares = useMemo(() => {
    return state.capTable.reduce((acc, curr) => acc + (Number(curr.shares) || 0), 0);
  }, [state.capTable]);

  const totalCapitalInvested = useMemo(() => {
    return state.capTable.reduce((acc, curr) => acc + (Number(curr.investmentAmount) || 0), 0);
  }, [state.capTable]);

  const totalSafeCapital = useMemo(() => {
    return state.safes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [state.safes]);

  // Synchronous, Real-Time Quant Computations (Zero flickering, zero network round-trip delay, zero infinite loops)
  const conversionResult = useMemo(() => {
    return calculateSafeConversion(state.companyDetails, state.capTable, state.safes);
  }, [state.companyDetails, state.capTable, state.safes]);

  // Founder specific ownership calculations
  const founderMetrics = useMemo(() => {
    const founders = state.capTable.filter(
      (s) =>
        s.name.toLowerCase().includes('founder') ||
        s.name.toLowerCase().includes('ceo') ||
        s.name.toLowerCase().includes('cto') ||
        s.shareClass === 'Common'
    );
    const founderShares = founders.reduce((acc, curr) => acc + (Number(curr.shares) || 0), 0);
    const currentPct = totalIssuedShares > 0 ? (founderShares / totalIssuedShares) * 100 : 0;

    let dilutedPct = currentPct;
    if (conversionResult && conversionResult.totalShares > 0) {
      dilutedPct = (founderShares / conversionResult.totalShares) * 100;
    }

    return {
      names: founders.map((f) => f.name.split(' ')[0]).join(' & '),
      shares: founderShares,
      currentPct: currentPct.toFixed(1),
      dilutedPct: dilutedPct.toFixed(1),
    };
  }, [state.capTable, totalIssuedShares, conversionResult]);

  // Unallocated pool shares
  const unallocatedOptionPoolShares = useMemo(() => {
    const pool = state.capTable.find(
      (s) =>
        s.name.toLowerCase().includes('pool') ||
        s.name.toLowerCase().includes('option')
    );
    return pool ? Number(pool.shares) || 0 : 0;
  }, [state.capTable]);

  // Term Sheet Duel Calculation
  const termSheetComparison = useMemo(() => {
    return compareTermSheets(
      founderMetrics.shares,
      totalIssuedShares,
      offerA,
      offerB
    );
  }, [founderMetrics.shares, totalIssuedShares, offerA, offerB]);

  // Option Pool Runway Calculation
  const optionPoolRunway = useMemo(() => {
    return calculateOptionPoolRunway(
      totalIssuedShares,
      unallocatedOptionPoolShares,
      plannedHires
    );
  }, [totalIssuedShares, unallocatedOptionPoolShares, plannedHires]);

  // SAFE Stack Analytics for Multi-SAFE Ledgers
  const safeStackMetrics = useMemo(() => {
    const postSafes = state.safes.filter((s) => s.type === 'Post-Money');
    const preSafes = state.safes.filter((s) => s.type === 'Pre-Money');
    const avgCap =
      state.safes.length > 0
        ? state.safes.reduce((acc, s) => acc + (Number(s.valuationCap) || 0), 0) /
          state.safes.length
        : 0;
    return {
      count: state.safes.length,
      postCount: postSafes.length,
      preCount: preSafes.length,
      avgCap,
      totalSafeDilution: conversionResult.totalSafeDilutionPercent,
    };
  }, [state.safes, conversionResult]);

  // Market Benchmark Recommendation (Empirical PitchBook / AngelList Data)
  const benchmarkRec = useMemo(() => {
    return calculateBenchmarkRecommendation({
      stage: currentStage,
      sector: benchmarkSector,
      traction: benchmarkTraction,
      geography: benchmarkGeo,
    });
  }, [currentStage, benchmarkSector, benchmarkTraction, benchmarkGeo]);

  const handleApplyBenchmark = useCallback(() => {
    setState((prev) => ({
      ...prev,
      companyDetails: {
        ...prev.companyDetails,
        targetSeriesAValuation: benchmarkRec.preMoneyValuation,
        seriesANewMoney: benchmarkRec.newMoneyRaised,
      },
    }));
    setBenchmarkAppliedFeedback(true);
    setTimeout(() => setBenchmarkAppliedFeedback(false), 3000);
  }, [benchmarkRec]);

  const bsmResult = useMemo(() => {
    return calculateBlackScholes(state.params409A);
  }, [state.params409A]);

  const waterfallResult = useMemo(() => {
    const activeTable: Stakeholder[] =
      conversionResult && activeLedgerView === 'diluted'
        ? conversionResult.dilutedCapTable.map((s) => ({
            id: s.id,
            name: s.name,
            shareClass: s.shareClass,
            shares: s.shares,
            investmentAmount: s.investmentAmount,
          }))
        : state.capTable;

    return calculateWaterfall(activeTable, state.waterfallParams.exitValuation);
  }, [conversionResult, activeLedgerView, state.capTable, state.waterfallParams.exitValuation]);

  // Stage Switcher Handler
  const handleSelectStage = (stage: StartupStage) => {
    setCurrentStage(stage);
    let newState: TerminalState;
    if (stage === 'pre-seed') newState = generatePreSeedState();
    else if (stage === 'seed') newState = generateSeedState();
    else if (stage === 'series-a') newState = generateSeriesAState();
    else newState = generateSeriesBState();

    setState(newState);
    setActiveLedgerView('current');
  };

  const handleAddSafeToCapTable = () => {
    const newSafe: SafeNote = {
      id: `safe-${Date.now()}`,
      investor: newSafeName,
      amount: newSafeAmount,
      valuationCap: newSafeCap,
      discount: newSafeDiscount,
      type: newSafeType,
    };
    setState((prev) => ({
      ...prev,
      safes: [...prev.safes, newSafe],
    }));
    setSafeSimAddedFeedback(true);
    setTimeout(() => setSafeSimAddedFeedback(false), 2000);
  };

  const handleAddInlineSafe = () => {
    const newSafe: SafeNote = {
      id: `safe-${Date.now()}`,
      investor: inlineSafeName,
      amount: inlineSafeAmount,
      valuationCap: inlineSafeCap,
      discount: inlineSafeDiscount,
      type: inlineSafeType,
    };
    setState((prev) => ({
      ...prev,
      safes: [...prev.safes, newSafe],
    }));
    setShowInlineAddSafe(false);
    setInlineSafeName('Angel Check');
  };

  const handleDeleteSafe = (id: string) => {
    setState((prev) => ({
      ...prev,
      safes: prev.safes.filter((s) => s.id !== id),
    }));
  };

  const exportToCSV = () => {
    const headers = ['Name', 'ShareClass', 'Shares', 'InvestmentAmount'];
    const rows = state.capTable.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      s.shareClass,
      s.shares,
      s.investmentAmount,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${state.companyDetails.companyName.replace(/[^a-z0-9]/gi, '_')}_cap_table.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessImportedCsv = (csvText: string) => {
    const parseResult = parseCapTableCsv(csvText);
    if (parseResult.success && parseResult.stakeholders.length > 0) {
      const minAuthorized = Math.max(
        Number(state.companyDetails.totalAuthorizedShares) || 0,
        Math.round(parseResult.totalShares * 1.25)
      );

      setState((prev) => ({
        ...prev,
        companyDetails: {
          ...prev.companyDetails,
          totalAuthorizedShares: minAuthorized,
        },
        capTable: parseResult.stakeholders,
      }));

      setImportedSummary(parseResult);
      setActiveLedgerView('current');
    } else {
      alert(
        parseResult.errors.length > 0
          ? `Could not import cap table:\n${parseResult.errors.join('\n')}`
          : 'CSV file format not recognized. Please use Name, ShareClass, Shares, InvestmentAmount.'
      );
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) handleProcessImportedCsv(text);
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const downloadSampleTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURI(SAMPLE_CSV_TEMPLATE);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'morse_bridge_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const safeEstimatedOwnershipPct = useMemo(() => {
    if (newSafeCap <= 0) return 0;
    return ((newSafeAmount / newSafeCap) * 100).toFixed(2);
  }, [newSafeAmount, newSafeCap]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070b13] text-slate-200 font-sans">
      {/* =========================================================================
          LEFT VERTICAL NAVIGATION SIDEBAR
         ========================================================================= */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-800 bg-[#0a0f1c] select-none z-30">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-400 to-cyan-400 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md">
              MB
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                Morse Bridge
                <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 rounded">
                  v2.0
                </span>
              </h1>
              <span className="text-[10px] text-slate-400 block font-mono">
                Institutional Equity Terminal
              </span>
            </div>
          </div>
        </div>

        {/* Company Profile Card */}
        <div className="p-3 mx-2 my-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block mb-0.5">
            Active Workspace
          </span>
          <span className="text-xs font-semibold text-white block truncate">
            {state.companyDetails.companyName}
          </span>
          <span className="text-[11px] text-emerald-400 font-mono block mt-0.5">
            {totalIssuedShares.toLocaleString()} shares issued
          </span>
        </div>

        {/* Startup Stage Selector */}
        <div className="px-3 py-2 border-b border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
            Startup Stage Switcher
          </span>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {[
              { id: 'pre-seed', label: 'Pre-Seed', desc: 'SAFEs & Founders' },
              { id: 'seed', label: 'Series Seed', desc: 'Priced Seed Round' },
              { id: 'series-a', label: 'Series A', desc: 'Venture Scale' },
              { id: 'growth', label: 'Growth Stage', desc: '80+ Investors' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectStage(s.id as StartupStage)}
                className={`p-2 rounded-lg text-left transition-all ${
                  currentStage === s.id
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                }`}
              >
                <span className="block">{s.label}</span>
                <span className="text-[9px] text-slate-500 block truncate">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Vertical Navigation Menu */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 px-2">
            Core Cap Table
          </span>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex w-full items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'ledger'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
            }`}
          >
            <PieChart className="h-4 w-4 text-amber-400" />
            <span>Cap Table Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('safe-creator')}
            className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'safe-creator'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <FilePlus className="h-4 w-4 text-emerald-400" />
              <span>SAFE Creator & Sim</span>
            </div>
            {state.safes.length > 0 && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.2 rounded-full">
                {state.safes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('round-modeling')}
            className={`flex w-full items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'round-modeling'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
            }`}
          >
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            <span>Priced Round Dilution</span>
          </button>

          {/* Strategic Tools (Beyond Legacy) */}
          <div className="pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 px-2">
              Strategic Founder Tools
            </span>

            <button
              onClick={() => setActiveTab('term-sheet-duel')}
              className={`flex w-full items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'term-sheet-duel'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
              }`}
            >
              <Swords className="h-4 w-4 text-rose-400" />
              <span>Term Sheet Duel (A vs B)</span>
            </button>

            <button
              onClick={() => setActiveTab('option-pool-hiring')}
              className={`flex w-full items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'option-pool-hiring'
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
              }`}
            >
              <UserCheck className="h-4 w-4 text-indigo-400" />
              <span>Hiring & Pool Runway</span>
            </button>
          </div>

          {/* Compliance & Liquidity */}
          <div className="pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 px-2">
              Compliance & Liquidity
            </span>

            <button
              onClick={() => setActiveTab('409a')}
              className={`flex w-full items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === '409a'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
              }`}
            >
              <Award className="h-4 w-4 text-purple-400" />
              <span>409A Valuation Engine</span>
            </button>

            <button
              onClick={() => setActiveTab('waterfall')}
              className={`flex w-full items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'waterfall'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
              }`}
            >
              <Wallet className="h-4 w-4 text-amber-400" />
              <span>Exit Waterfall & Cash</span>
            </button>

            <button
              onClick={() => setActiveTab('import-export')}
              className={`flex w-full items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'import-export'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-400" />
              <span>Bring Your Old Data</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#080d18] space-y-2">
          <button
            onClick={() => setShowDueDiligenceModal(true)}
            className="flex w-full items-center justify-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 hover:text-white transition-all"
          >
            <FileText className="h-3.5 w-3.5 text-cyan-400" />
            <span>Due Diligence One-Pager</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex w-full items-center justify-center space-x-1.5 rounded-lg border border-amber-500/60 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 active:scale-95 transition-all shadow-sm"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">Share Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>Share Cap Table (URL)</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Zero-DB • Stateless</span>
            </span>
            <button
              onClick={() => handleSelectStage(currentStage)}
              className="text-slate-400 hover:text-white underline"
            >
              Reset
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT MAIN CONTENT AREA
         ========================================================================= */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#070b13]">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-800 bg-[#0a0f1c]/90 px-6 flex items-center justify-between backdrop-blur">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-bold text-white tracking-tight uppercase">
              {activeTab === 'ledger' && 'Cap Table Ledger & Ownership'}
              {activeTab === 'safe-creator' && 'Pre-Seed SAFE Creator & Simulator'}
              {activeTab === 'round-modeling' && 'Priced Round Dilution Engine'}
              {activeTab === 'term-sheet-duel' && 'Term Sheet Duel: Compare 2 VC Offers'}
              {activeTab === 'option-pool-hiring' && 'Hiring & Option Pool Runway'}
              {activeTab === '409a' && '409A Black-Scholes Valuation'}
              {activeTab === 'waterfall' && 'Liquidation Waterfall & Payouts'}
              {activeTab === 'import-export' && 'Import Old Data from Spreadsheet or CSV'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
              {currentStage.toUpperCase()} WORKSPACE
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Founder vs Quant Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode('founder')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'founder'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Founder Friendly</span>
              </button>
              <button
                onClick={() => setViewMode('quant')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'quant'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="h-3 w-3 text-cyan-400" />
                <span>VC / Quant View</span>
              </button>
            </div>

            <button
              onClick={exportToCSV}
              className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </header>

        {/* Dynamic Content View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* =====================================================================
              VIEW 1: CAP TABLE LEDGER
             ===================================================================== */}
          {activeTab === 'ledger' && (
            <div className="space-y-5">
              {/* Daily Founder Benchmark Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#0c1428] via-[#0f172a] to-[#0c1428] border border-cyan-500/30 rounded-xl px-4 py-2.5 text-xs shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-slate-300 font-medium">
                      Q1 2026 Market Benchmark for <strong className="text-white">{benchmarkRec.stageName}</strong>:
                    </span>{' '}
                    <span className="font-mono font-bold text-cyan-400">
                      ${(benchmarkRec.preMoneyValuation / 1_000_000).toFixed(1)}M Pre-Money
                    </span>{' '}
                    <span className="text-slate-400 hidden sm:inline">
                      (Typical Check: ${(benchmarkRec.newMoneyRaised / 1_000_000).toFixed(1)}M • {benchmarkRec.impliedDilutionPct}% Dilution)
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleApplyBenchmark}
                    className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                      benchmarkAppliedFeedback
                        ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{benchmarkAppliedFeedback ? '✓ Benchmark Applied' : 'Confirm & Apply Benchmark'}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('round-modeling')}
                    className="text-slate-400 hover:text-slate-200 text-[11px] underline ml-1"
                  >
                    Customize Factors →
                  </button>
                </div>
              </div>

              {/* Top KPI Cards (Adapts to Active View) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {activeLedgerView === 'safes' ? (
                  <>
                    <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
                      <span className="text-xs text-slate-400 block font-medium">Active SAFE Notes</span>
                      <span className="text-2xl font-bold text-purple-300 font-mono mt-1 block">
                        {state.safes.length} Notes
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        {safeStackMetrics.postCount} Post-Money • {safeStackMetrics.preCount} Pre-Money
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
                      <span className="text-xs text-slate-400 block font-medium">Total SAFE Capital</span>
                      <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
                        ${totalSafeCapital.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Committed unpriced angel capital
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
                      <span className="text-xs text-slate-400 block font-medium">Total SAFE Dilution</span>
                      <span className="text-2xl font-bold text-amber-300 font-mono mt-1 block">
                        {conversionResult.totalSafeDilutionPercent}%
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Aggregate dilution on conversion
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
                      <span className="text-xs text-slate-400 block font-medium">Blended Valuation Cap</span>
                      <span className="text-2xl font-bold text-cyan-400 font-mono mt-1 block">
                        ${(safeStackMetrics.avgCap / 1_000_000).toFixed(1)}M
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Average cap across active notes
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
                      <span className="text-xs text-slate-400 block font-medium">Founders Retain</span>
                      <div className="flex items-baseline space-x-2 mt-1">
                        <span className="text-2xl font-bold text-white font-mono">
                          {activeLedgerView === 'diluted' ? founderMetrics.dilutedPct : founderMetrics.currentPct}%
                        </span>
                        {activeLedgerView === 'diluted' && (
                          <span className="text-xs text-rose-400 font-medium">
                            (-{(Number(founderMetrics.currentPct) - Number(founderMetrics.dilutedPct)).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        {founderMetrics.shares.toLocaleString()} Common shares
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
                      <span className="text-xs text-slate-400 block font-medium">Total Issued Shares</span>
                      <span className="text-2xl font-bold text-cyan-400 font-mono mt-1 block">
                        {activeLedgerView === 'diluted' && conversionResult
                          ? conversionResult.totalShares.toLocaleString()
                          : totalIssuedShares.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Authorized: {state.companyDetails.totalAuthorizedShares.toLocaleString()}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
                      <span className="text-xs text-slate-400 block font-medium">Capital Invested</span>
                      <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
                        ${totalCapitalInvested.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        From founders & equity rounds
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4">
                      <span className="text-xs text-slate-400 block font-medium">Active SAFEs</span>
                      <span className="text-2xl font-bold text-amber-300 font-mono mt-1 block">
                        ${totalSafeCapital.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        {state.safes.length} unconverted notes
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* View Mode Toggle: 3 Perspectives */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1424] p-2 rounded-xl border border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setActiveLedgerView('current')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeLedgerView === 'current'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    1. Current Ownership (Stock)
                  </button>

                  <button
                    onClick={() => setActiveLedgerView('safes')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      activeLedgerView === 'safes'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>2. Active SAFE Notes Stack</span>
                    <span className="rounded-full bg-purple-500/30 px-1.5 py-0.2 text-[10px] font-bold text-purple-200">
                      {state.safes.length} Notes
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveLedgerView('diluted')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeLedgerView === 'diluted'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    3. Post-Series A Pro-Forma (Diluted)
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {activeLedgerView === 'safes' && (
                    <button
                      onClick={() => setShowInlineAddSafe(!showInlineAddSafe)}
                      className="flex items-center space-x-1.5 rounded-lg border border-purple-500/50 bg-purple-500/20 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/30 transition-all shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{showInlineAddSafe ? 'Cancel' : '+ Add SAFE Note'}</span>
                    </button>
                  )}
                  <div className="flex items-center space-x-2 bg-slate-950 rounded-lg px-2.5 py-1 border border-slate-800">
                    <Search className="h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search stakeholder or investor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-0 text-white placeholder-slate-500 text-xs focus:outline-none w-44"
                    />
                  </div>
                </div>
              </div>

              {/* Inline Quick Add SAFE Bar (If Toggled) */}
              {activeLedgerView === 'safes' && showInlineAddSafe && (
                <div className="rounded-xl border border-purple-500/40 bg-slate-950 p-4 space-y-3 shadow-md animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Plus className="h-4 w-4" /> Quick Add Angel SAFE to Ledger
                    </span>
                    <button
                      onClick={() => setShowInlineAddSafe(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Investor / Syndicate</label>
                      <input
                        type="text"
                        value={inlineSafeName}
                        onChange={(e) => setInlineSafeName(e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">SAFE Structure</label>
                      <select
                        value={inlineSafeType}
                        onChange={(e) => setInlineSafeType(e.target.value as any)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white focus:outline-none"
                      >
                        <option value="Post-Money">Post-Money (YC Standard)</option>
                        <option value="Pre-Money">Pre-Money (Classic)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Investment Amount ($)</label>
                      <input
                        type="number"
                        step="25000"
                        value={inlineSafeAmount}
                        onChange={(e) => setInlineSafeAmount(Number(e.target.value))}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-emerald-400 font-mono font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Valuation Cap ($)</label>
                      <input
                        type="number"
                        step="500000"
                        value={inlineSafeCap}
                        onChange={(e) => setInlineSafeCap(Number(e.target.value))}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-amber-300 font-mono font-bold focus:outline-none"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddInlineSafe}
                        className="w-full rounded border border-emerald-500/50 bg-emerald-500/20 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all"
                      >
                        Add to Ledger
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ledger Data Table */}
              <div className="rounded-xl border border-slate-800 bg-[#0d1424] overflow-hidden shadow-sm">
                {activeLedgerView === 'safes' ? (
                  /* ========================================================
                     SAFE NOTES LEDGER TABLE (MULTIPLE SAFES VIEW)
                     ======================================================== */
                  <table className="w-full text-left">
                    <thead className="bg-[#0f172a] text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800 font-medium">
                      <tr>
                        <th className="py-3 px-4">Investor / Noteholder</th>
                        <th className="py-3 px-3 text-center">SAFE Instrument</th>
                        <th className="py-3 px-4 text-right">Committed Capital</th>
                        <th className="py-3 px-4 text-right">Valuation Cap</th>
                        <th className="py-3 px-3 text-center">Discount</th>
                        <th className="py-3 px-4 text-right">Implied Ownership %</th>
                        <th className="py-3 px-4 text-right">Est. Converted Shares</th>
                        <th className="py-3 px-4 text-right font-mono">Effective PPS</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {conversionResult.safeBreakdown
                        .filter((s) => s.investor.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((safe, idx) => (
                          <tr key={safe.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-200">
                              <div className="flex items-center space-x-2.5">
                                <span
                                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor:
                                      STAKEHOLDER_PALETTE[(idx + 2) % STAKEHOLDER_PALETTE.length],
                                  }}
                                />
                                <div>
                                  <span className="font-semibold text-white">{safe.investor}</span>
                                  <span className="block text-[10px] text-slate-400">ID: {safe.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  safe.type === 'Post-Money'
                                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {safe.type === 'Post-Money' ? 'Post-Money (YC)' : 'Pre-Money'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                              ${safe.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-amber-300 font-medium">
                              {safe.valuationCap > 0
                                ? `$${(safe.valuationCap / 1_000_000).toFixed(1)}M`
                                : 'Uncapped'}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-300">
                              {safe.discount > 0 ? `${(safe.discount * 100).toFixed(0)}%` : '0%'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-purple-300">
                              <div className="flex items-center justify-end space-x-2">
                                <span>{safe.impliedOwnershipPct.toFixed(2)}%</span>
                                <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                  <div
                                    className="bg-purple-500 h-full rounded-full"
                                    style={{ width: `${Math.min(100, safe.impliedOwnershipPct * 4)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-200">
                              {safe.estimatedShares.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">
                              ${safe.effectivePps.toFixed(4)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleDeleteSafe(safe.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                title="Delete SAFE note"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      {state.safes.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No active SAFE notes recorded. Click "+ Add SAFE Note" above or use the SAFE Creator tab to add angel notes.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {state.safes.length > 0 && (
                      <tfoot className="bg-[#0b101d] text-xs font-bold border-t border-slate-800">
                        <tr>
                          <td className="py-3 px-4 text-slate-300">Total SAFE Stack ({state.safes.length} Notes)</td>
                          <td className="py-3 px-3 text-center text-slate-400">—</td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-mono">
                            ${totalSafeCapital.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-amber-300 font-mono">
                            Blended ${(safeStackMetrics.avgCap / 1_000_000).toFixed(1)}M
                          </td>
                          <td className="py-3 px-3 text-center text-slate-400">—</td>
                          <td className="py-3 px-4 text-right text-purple-300 font-mono">
                            {conversionResult.totalSafeDilutionPercent}%
                          </td>
                          <td className="py-3 px-4 text-right text-slate-200 font-mono">
                            {conversionResult.safeBreakdown.reduce((sum, s) => sum + s.estimatedShares, 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
                          <td className="py-3 px-3 text-center text-slate-400">—</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                ) : (
                  /* ========================================================
                     CURRENT STOCKHOLDERS OR DILUTED PRO-FORMA TABLE
                     ======================================================== */
                  <table className="w-full text-left">
                    <thead className="bg-[#0f172a] text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800 font-medium">
                      <tr>
                        <th className="py-3 px-4">Stakeholder / Grantee</th>
                        <th className="py-3 px-3 text-center">Share Class</th>
                        <th className="py-3 px-4 text-right">Shares</th>
                        <th className="py-3 px-4 text-right">Ownership %</th>
                        <th className="py-3 px-4 text-right">Cash Invested</th>
                        {viewMode === 'quant' && (
                          <th className="py-3 px-4 text-right font-mono">Cost Basis (PPS)</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {activeLedgerView === 'current' ? (
                        state.capTable
                          .filter((stk) =>
                            stk.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((stk, idx) => {
                            const ownership =
                              totalIssuedShares > 0 ? (stk.shares / totalIssuedShares) * 100 : 0;
                            const pps =
                              stk.shares > 0 && stk.investmentAmount > 0
                                ? stk.investmentAmount / stk.shares
                                : 0;
                            return (
                              <tr key={stk.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="py-3 px-4 font-medium text-slate-200">
                                  <div className="flex items-center space-x-2.5">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                      style={{
                                        backgroundColor:
                                          STAKEHOLDER_PALETTE[idx % STAKEHOLDER_PALETTE.length],
                                      }}
                                    />
                                    <span>{stk.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                      stk.shareClass === 'Preferred'
                                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    {stk.shareClass}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-200 font-mono">
                                  {stk.shares.toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                                  <div className="flex items-center justify-end space-x-2">
                                    <span>{ownership.toFixed(2)}%</span>
                                    <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                      <div
                                        className="bg-emerald-500 h-full rounded-full"
                                        style={{ width: `${Math.min(100, ownership)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-400 font-mono">
                                  ${stk.investmentAmount.toLocaleString()}
                                </td>
                                {viewMode === 'quant' && (
                                  <td className="py-3 px-4 text-right text-slate-300 font-mono">
                                    ${pps.toFixed(2)}
                                  </td>
                                )}
                              </tr>
                            );
                          })
                      ) : conversionResult ? (
                        conversionResult.dilutedCapTable
                          .filter((stk) =>
                            stk.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((stk, idx) => (
                            <tr key={stk.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 font-medium text-slate-200">
                                <div className="flex items-center space-x-2.5">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                    style={{
                                      backgroundColor:
                                        STAKEHOLDER_PALETTE[idx % STAKEHOLDER_PALETTE.length],
                                    }}
                                  />
                                  <div>
                                    <span>{stk.name}</span>
                                    <span className="block text-[10px] text-cyan-400 font-normal">
                                      {stk.source}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    stk.shareClass === 'Preferred'
                                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {stk.shareClass}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-white font-mono font-medium">
                                {stk.shares.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                                <div className="flex items-center justify-end space-x-2">
                                  <span>{stk.ownershipPercent.toFixed(2)}%</span>
                                  <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                    <div
                                      className="bg-emerald-500 h-full rounded-full"
                                      style={{ width: `${Math.min(100, stk.ownershipPercent)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right text-slate-400 font-mono">
                                ${stk.investmentAmount.toLocaleString()}
                              </td>
                              {viewMode === 'quant' && (
                                <td className="py-3 px-4 text-right text-cyan-300 font-mono">
                                  ${stk.effectivePricePerShare.toFixed(3)}
                                </td>
                              )}
                            </tr>
                          ))
                      ) : null}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Founder-Friendly SAFE Stack Dilution Intelligence (When viewing SAFEs) */}
              {activeLedgerView === 'safes' && (
                <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-[#0d1424] to-[#120d24] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="h-4 w-4 text-purple-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        Founder Intelligence: Multiple SAFE Dilution & Stacking Analysis
                      </h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        conversionResult.totalSafeDilutionPercent <= 15
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : conversionResult.totalSafeDilutionPercent <= 22
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {conversionResult.totalSafeDilutionPercent <= 15
                        ? '● Healthy SAFE Stack (<15% Dilution)'
                        : conversionResult.totalSafeDilutionPercent <= 22
                        ? '▲ Moderate SAFE Dilution (15%–22%)'
                        : '⚠ High SAFE Stacking Risk (>22% Dilution)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 pt-1">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="font-bold text-white block mb-1">Post-Money SAFE Mechanics</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Post-money SAFEs lock in ownership independently. Each new post-money SAFE you sell does NOT dilute earlier post-money SAFE holders—it dilutes only the founders and common shareholders until the priced round.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="font-bold text-white block mb-1">Total Effective Dilution</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Across all {state.safes.length} active notes, your aggregate SAFE dilution is <strong className="text-purple-300 font-mono">{conversionResult.totalSafeDilutionPercent}%</strong> of the fully diluted company.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="font-bold text-white block mb-1">Next Step Simulation</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Switch to <button onClick={() => setActiveLedgerView('diluted')} className="text-cyan-400 underline font-semibold">Post-Series A Pro-Forma</button> to see exactly how these {state.safes.length} SAFEs convert alongside a new VC lead investor check.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 2: SAFE CREATOR & SIMULATOR
             ===================================================================== */}
          {activeTab === 'safe-creator' && (
            <div className="max-w-4xl space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <FilePlus className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">
                    Create & Simulate a SAFE Note
                  </h2>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  SAFEs (Simple Agreements for Future Equity) allow pre-seed and seed founders to raise early capital without valuing the entire company today. Use this builder to test your terms before signing.
                </p>

                {/* Live Dilution Simulation Card */}
                <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-amber-500/10 border border-emerald-500/30 p-4">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs font-semibold text-emerald-300 uppercase">
                      Live Dilution Impact:
                    </span>
                    <span className="text-xl font-bold text-emerald-400 font-mono">
                      ~{safeEstimatedOwnershipPct}% of your company
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    A <strong>${newSafeAmount.toLocaleString()}</strong> investment at a{' '}
                    <strong>${newSafeCap.toLocaleString()}</strong> valuation cap will sell
                    approximately <strong>{safeEstimatedOwnershipPct}%</strong> of equity upon Series A conversion.
                  </p>
                </div>

                {/* Form Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      Investor / Syndicate Name
                    </label>
                    <input
                      type="text"
                      value={newSafeName}
                      onChange={(e) => setNewSafeName(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      SAFE Structure
                    </label>
                    <select
                      value={newSafeType}
                      onChange={(e) => setNewSafeType(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="Post-Money">Post-Money (YC Standard - Non-dilutive to other SAFEs)</option>
                      <option value="Pre-Money">Pre-Money (Classic - Dilutes with other SAFEs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      Check Amount ($)
                    </label>
                    <input
                      type="number"
                      step="25000"
                      value={newSafeAmount}
                      onChange={(e) => setNewSafeAmount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-emerald-400 font-mono font-semibold focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-medium block">
                        Valuation Cap ($)
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewSafeCap(benchmarkRec.recommendedSafeCap)}
                        className="text-[10px] text-amber-300 hover:text-amber-200 underline flex items-center gap-1 font-medium"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Auto-Fill Market Cap (${(benchmarkRec.recommendedSafeCap / 1_000_000).toFixed(1)}M)</span>
                      </button>
                    </div>
                    <input
                      type="number"
                      step="500000"
                      value={newSafeCap}
                      onChange={(e) => setNewSafeCap(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-amber-300 font-mono font-semibold focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      Discount Percentage (e.g., 0.20 for 20%)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={newSafeDiscount}
                      onChange={(e) => setNewSafeDiscount(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 font-mono focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Add to Cap Table Action */}
                <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Will be stored in URL hash instantly without a database.
                  </span>
                  <button
                    onClick={handleAddSafeToCapTable}
                    className="flex items-center space-x-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all shadow-sm"
                  >
                    {safeSimAddedFeedback ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Added to Cap Table!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Add to Cap Table & Simulate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Active SAFEs List */}
              <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Active SAFEs in this Workspace ({state.safes.length})
                </h3>
                <div className="divide-y divide-slate-800/60">
                  {state.safes.map((safe) => (
                    <div key={safe.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white block">{safe.investor}</span>
                        <span className="text-[11px] text-slate-400">
                          {safe.type} • ${(safe.valuationCap / 1_000_000).toFixed(1)}M Cap •{' '}
                          {(safe.discount * 100).toFixed(0)}% Discount
                        </span>
                      </div>
                      <div className="text-right flex items-center space-x-3">
                        <span className="font-mono text-emerald-400 font-bold block">
                          ${safe.amount.toLocaleString()}
                        </span>
                        <button
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              safes: prev.safes.filter((s) => s.id !== safe.id),
                            }))
                          }
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 3: PRICED ROUND DILUTION MODELING
             ===================================================================== */}
          {activeTab === 'round-modeling' && (
            <div className="max-w-4xl space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-cyan-400" />
                  <h2 className="text-base font-bold text-white">
                    Series A / Priced Round Simulation
                  </h2>
                </div>
                <p className="text-xs text-slate-300">
                  Model how a new venture capital round converts all your SAFEs into preferred stock and calculates your post-money price per share.
                </p>

                {/* Auto Benchmark Valuation Engine (One-Click Founder Confirmation) */}
                <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1629] to-[#080e1a] p-5 space-y-4 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-white">Auto-Calculate Market Valuation</h3>
                          <span className="rounded-full bg-cyan-500/20 text-cyan-300 px-2 py-0.5 text-[10px] font-bold border border-cyan-500/30">
                            Q1 2026 PitchBook Benchmarks
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Empirical pre-money valuation calculated from current market data. You simply review and confirm.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleApplyBenchmark}
                      className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-md ${
                        benchmarkAppliedFeedback
                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      <span>
                        {benchmarkAppliedFeedback
                          ? '✓ Benchmark Applied!'
                          : `Confirm & Apply $${(benchmarkRec.preMoneyValuation / 1_000_000).toFixed(1)}M Benchmark`}
                      </span>
                    </button>
                  </div>

                  {/* Day-to-Day User Knobs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Sector / Vertical</label>
                      <select
                        value={benchmarkSector}
                        onChange={(e) => setBenchmarkSector(e.target.value as SectorVertical)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                      >
                        {Object.entries(BENCHMARK_SECTORS).map(([key, item]) => (
                          <option key={key} value={key}>
                            {item.name} ({item.multiplier >= 1 ? `+${Math.round((item.multiplier - 1) * 100)}%` : `${Math.round((item.multiplier - 1) * 100)}%`})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Traction Milestone</label>
                      <select
                        value={benchmarkTraction}
                        onChange={(e) => setBenchmarkTraction(e.target.value as TractionTier)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                      >
                        {Object.entries(BENCHMARK_TRACTIONS).map(([key, item]) => (
                          <option key={key} value={key}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Market / Hub</label>
                      <select
                        value={benchmarkGeo}
                        onChange={(e) => setBenchmarkGeo(e.target.value as GeographyMarket)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                      >
                        {Object.entries(BENCHMARK_GEOS).map(([key, item]) => (
                          <option key={key} value={key}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Benchmark Output Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Recommended Pre-Money</span>
                      <span className="text-lg font-bold text-cyan-400 font-mono mt-0.5 block">
                        ${(benchmarkRec.preMoneyValuation / 1_000_000).toFixed(1)}M
                      </span>
                      <span className="text-[10px] text-slate-400">50th Percentile Median</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Recommended VC Check</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5 block">
                        ${(benchmarkRec.newMoneyRaised / 1_000_000).toFixed(1)}M
                      </span>
                      <span className="text-[10px] text-slate-400">Target {benchmarkRec.impliedDilutionPct}% Dilution</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Market Spread (25th–75th)</span>
                      <span className="text-base font-bold text-white font-mono mt-0.5 block">
                        ${(benchmarkRec.range25th / 1_000_000).toFixed(1)}M – ${(benchmarkRec.range75th / 1_000_000).toFixed(1)}M
                      </span>
                      <span className="text-[10px] text-slate-400">Typical Deal Band</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">Recommended SAFE Cap</span>
                      <span className="text-lg font-bold text-amber-300 font-mono mt-0.5 block">
                        ${(benchmarkRec.recommendedSafeCap / 1_000_000).toFixed(1)}M
                      </span>
                      <span className="text-[10px] text-slate-400">For unpriced notes</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 italic bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                    💡 {benchmarkRec.rationale}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      Series A Pre-Money Valuation ($)
                    </label>
                    <input
                      type="number"
                      step="1000000"
                      value={state.companyDetails.targetSeriesAValuation}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          companyDetails: {
                            ...prev.companyDetails,
                            targetSeriesAValuation: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">
                      New Cash Raised from Lead VC ($)
                    </label>
                    <input
                      type="number"
                      step="1000000"
                      value={state.companyDetails.seriesANewMoney}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          companyDetails: {
                            ...prev.companyDetails,
                            seriesANewMoney: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setActiveLedgerView('diluted');
                      setActiveTab('ledger');
                    }}
                    className="flex items-center space-x-2 rounded-lg border border-cyan-500/50 bg-cyan-500/20 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition-all shadow-sm"
                  >
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>View Diluted Pro-Forma Ledger →</span>
                  </button>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Calculated in Real-Time
                  </span>
                </div>
              </div>

              {conversionResult && (
                <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white">Dilution Analysis Results</h3>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Post-Money Valuation</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">
                        ${(conversionResult.postMoneyValuation / 1_000_000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Series A Share Price</span>
                      <span className="text-lg font-bold text-cyan-400 font-mono">
                        ${conversionResult.seriesAPricePerShare}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">SAFE Dilution</span>
                      <span className="text-lg font-bold text-amber-300 font-mono">
                        {conversionResult.totalSafeDilutionPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 4: STRATEGIC TOOL: TERM SHEET DUEL (OFFER A vs OFFER B)
             ===================================================================== */}
          {activeTab === 'term-sheet-duel' && (
            <div className="max-w-5xl space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Swords className="h-5 w-5 text-rose-400" />
                    <h2 className="text-base font-bold text-white">
                      Term Sheet Duel: Side-by-Side VC Offer Comparison
                    </h2>
                  </div>
                  <span className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-medium">
                    Option Pool Shuffle Solver
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Never get misled by high headline pre-money valuations. When a VC requires a 15% pre-money option pool expansion, the founders pay 100% of that dilution. Compare two real offers to see which one preserves more founder equity in actual dollars.
                </p>

                {/* Verdict Banner */}
                <div className="rounded-xl bg-gradient-to-r from-rose-500/15 via-amber-500/15 to-emerald-500/15 border border-amber-500/40 p-4">
                  <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm mb-1">
                    <Award className="h-4 w-4 text-amber-400" />
                    <span>Strategic Verdict:</span>
                  </div>
                  <p className="text-xs text-white font-medium">
                    {termSheetComparison.verdict}
                  </p>
                </div>

                {/* Side-by-Side Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  {/* Offer A Card */}
                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-cyan-400 text-sm">Offer A</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Founder Take: {termSheetComparison.offerA.founderOwnershipPct}%
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Lead Investor Name</label>
                        <input
                          type="text"
                          value={offerA.leadInvestor}
                          onChange={(e) => setOfferA({ ...offerA, leadInvestor: e.target.value })}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-400 block mb-0.5">Pre-Money ($)</label>
                          <input
                            type="number"
                            step="500000"
                            value={offerA.preMoneyValuation}
                            onChange={(e) =>
                              setOfferA({ ...offerA, preMoneyValuation: Number(e.target.value) })
                            }
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-emerald-400 font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Check Size ($)</label>
                          <input
                            type="number"
                            step="500000"
                            value={offerA.investmentAmount}
                            onChange={(e) =>
                              setOfferA({ ...offerA, investmentAmount: Number(e.target.value) })
                            }
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-emerald-400 font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-400 block mb-0.5">Option Pool Req %</label>
                          <input
                            type="number"
                            step="0.01"
                            value={offerA.targetOptionPoolPct}
                            onChange={(e) =>
                              setOfferA({ ...offerA, targetOptionPoolPct: Number(e.target.value) })
                            }
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Pool Timing</label>
                          <select
                            value={offerA.poolTiming}
                            onChange={(e) =>
                              setOfferA({ ...offerA, poolTiming: e.target.value as any })
                            }
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 focus:outline-none"
                          >
                            <option value="Pre-Money">Pre-Money (Founders pay)</option>
                            <option value="Post-Money">Post-Money (Shared)</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Effective Pre-Money:</span>
                          <span className="font-mono text-white font-bold">
                            ${(termSheetComparison.offerA.effectiveValuation / 1_000_000).toFixed(2)}M
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Series A Price Per Share:</span>
                          <span className="font-mono text-cyan-300">
                            ${termSheetComparison.offerA.pricePerShare}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Offer B Card */}
                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-amber-400 text-sm">Offer B</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Founder Take: {termSheetComparison.offerB.founderOwnershipPct}%
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Lead Investor Name</label>
                        <input
                          type="text"
                          value={offerB.leadInvestor}
                          onChange={(e) => setOfferB({ ...offerB, leadInvestor: e.target.value })}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-400 block mb-0.5">Pre-Money ($)</label>
                          <input
                            type="number"
                            step="500000"
                            value={offerB.preMoneyValuation}
                            onChange={(e) =>
                              setOfferB({ ...offerB, preMoneyValuation: Number(e.target.value) })
                            }
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-emerald-400 font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Check Size ($)</label>
                          <input
                            type="number"
                            step="500000"
                            value={offerB.investmentAmount}
                            onChange={(e) =>
                              setOfferB({ ...offerB, investmentAmount: Number(e.target.value) })
                            }
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-emerald-400 font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-slate-400 block mb-0.5">Option Pool Req %</label>
                          <input
                            type="number"
                            step="0.01"
                            value={offerB.targetOptionPoolPct}
                            onChange={(e) =>
                              setOfferB({ ...offerB, targetOptionPoolPct: Number(e.target.value) })
                            }
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 font-mono focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Pool Timing</label>
                          <select
                            value={offerB.poolTiming}
                            onChange={(e) =>
                              setOfferB({ ...offerB, poolTiming: e.target.value as any })
                            }
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 focus:outline-none"
                          >
                            <option value="Pre-Money">Pre-Money (Founders pay)</option>
                            <option value="Post-Money">Post-Money (Shared)</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Effective Pre-Money:</span>
                          <span className="font-mono text-white font-bold">
                            ${(termSheetComparison.offerB.effectiveValuation / 1_000_000).toFixed(2)}M
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Series A Price Per Share:</span>
                          <span className="font-mono text-amber-300">
                            ${termSheetComparison.offerB.pricePerShare}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 5: STRATEGIC TOOL: HIRING & OPTION POOL RUNWAY
             ===================================================================== */}
          {activeTab === 'option-pool-hiring' && (
            <div className="max-w-4xl space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-base font-bold text-white">
                      Hiring & Employee Option Pool Runway
                    </h2>
                  </div>
                  <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono">
                    {unallocatedOptionPoolShares.toLocaleString()} Unallocated Options Available
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Plan your next 12-18 months of executive and engineering hiring. See how much of your unallocated equity budget remains before needing to dilute the company again.
                </p>

                {/* Pool Runway Fuel Gauge */}
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Option Pool Budget Status</span>
                    <span className={`font-mono ${optionPoolRunway.isOverallocated ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {optionPoolRunway.totalAllocatedToHiresPct}% Allocated of {optionPoolRunway.currentPoolPct}% Budget
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all ${optionPoolRunway.isOverallocated ? 'bg-rose-500' : 'bg-indigo-500'}`}
                      style={{
                        width: `${Math.min(100, (optionPoolRunway.totalAllocatedToHiresPct / (optionPoolRunway.currentPoolPct || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>
                      Remaining Unallocated:{' '}
                      <strong className="text-white font-mono">
                        {optionPoolRunway.remainingPoolPct}% ({optionPoolRunway.remainingPoolShares.toLocaleString()} shares)
                      </strong>
                    </span>
                    {optionPoolRunway.isOverallocated && (
                      <span className="text-rose-400 font-semibold">
                        ⚠️ Over budget by {optionPoolRunway.shortfallPct}%!
                      </span>
                    )}
                  </div>
                </div>

                {/* Planned Hires Table */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Planned Hires List ({plannedHires.length})
                    </h3>
                    <button
                      onClick={() =>
                        setPlannedHires([
                          ...plannedHires,
                          {
                            id: `h-${Date.now()}`,
                            role: 'Senior Software Engineer',
                            equityPct: 0.18,
                          },
                        ])
                      }
                      className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Planned Hire</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden divide-y divide-slate-800/60">
                    {plannedHires.map((hire) => (
                      <div key={hire.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex-1 mr-4">
                          <input
                            type="text"
                            value={hire.role}
                            onChange={(e) =>
                              setPlannedHires(
                                plannedHires.map((h) =>
                                  h.id === hire.id ? { ...h, role: e.target.value } : h
                                )
                              )
                            }
                            className="bg-transparent border-0 text-white font-medium focus:outline-none w-full"
                          />
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              step="0.05"
                              value={hire.equityPct}
                              onChange={(e) =>
                                setPlannedHires(
                                  plannedHires.map((h) =>
                                    h.id === hire.id
                                      ? { ...h, equityPct: Number(e.target.value) }
                                      : h
                                  )
                                )
                              }
                              className="w-16 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-right text-emerald-400 font-mono focus:outline-none"
                            />
                            <span className="text-slate-400">%</span>
                          </div>
                          <button
                            onClick={() =>
                              setPlannedHires(plannedHires.filter((h) => h.id !== hire.id))
                            }
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 6: 409A BLACK-SCHOLES VALUATION
             ===================================================================== */}
          {activeTab === '409a' && (
            <div className="max-w-4xl space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-purple-400" />
                  <h2 className="text-base font-bold text-white">
                    409A Stock Option Fair Market Value (IRS Compliant)
                  </h2>
                </div>
                <p className="text-xs text-slate-300">
                  Black-Scholes-Merton option pricing model used by certified independent appraisers to establish the legal exercise price for employee stock options.
                </p>

                {bsmResult && (
                  <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-300 font-medium block">
                        Recommended 409A Option Strike Price:
                      </span>
                      <span className="text-2xl font-bold text-purple-300 font-mono">
                        ${bsmResult.callPrice.toFixed(2)}
                        <span className="text-xs text-slate-400 font-normal"> / share</span>
                      </span>
                    </div>
                    <div className="text-right text-xs text-slate-400 font-mono">
                      <span>Underlying Share Price: </span>
                      <strong className="text-white">${state.params409A.stockPrice}</strong>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Stock Price ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={state.params409A.stockPrice}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          params409A: { ...prev.params409A, stockPrice: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Strike Price ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={state.params409A.strikePrice}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          params409A: { ...prev.params409A, strikePrice: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Time to Exit (Yrs)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={state.params409A.timeToExit}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          params409A: { ...prev.params409A, timeToExit: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Risk-Free Rate</label>
                    <input
                      type="number"
                      step="0.005"
                      value={state.params409A.riskFreeRate}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          params409A: { ...prev.params409A, riskFreeRate: Number(e.target.value) },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Expected Volatility (&sigma;)</span>
                    <span className="font-mono text-purple-300">
                      {(state.params409A.volatility * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.2"
                    step="0.05"
                    value={state.params409A.volatility}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        params409A: { ...prev.params409A, volatility: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 7: EXIT WATERFALL & CASH PAYOUTS
             ===================================================================== */}
          {activeTab === 'waterfall' && (
            <div className="max-w-4xl space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">
                    Liquidation Waterfall Simulation
                  </h2>
                </div>
                <p className="text-xs text-slate-300">
                  Simulate who gets paid first in an acquisition or IPO under standard 1x Non-Participating Preferred rights.
                </p>

                {/* Acquisition Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-slate-300">Gross Exit Proceeds:</span>
                    <span className="text-emerald-400 font-bold font-mono text-base">
                      ${(state.waterfallParams.exitValuation / 1_000_000).toFixed(1)} Million
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5000000"
                    max="350000000"
                    step="5000000"
                    value={state.waterfallParams.exitValuation}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        waterfallParams: { exitValuation: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Stacked Bar Chart */}
                {waterfallResult && waterfallResult.chartData.length > 0 && (
                  <div className="h-48 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={waterfallResult.chartData}
                        margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                        <YAxis
                          stroke="#64748b"
                          tickFormatter={(val) => `$${(val / 1_000_000).toFixed(0)}M`}
                          tick={{ fontSize: 9 }}
                        />
                        <Tooltip
                          formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Payout']}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#f8fafc',
                          }}
                        />
                        {waterfallResult.payouts.map((payout, idx) => (
                          <Bar
                            key={payout.stakeholderId}
                            dataKey={payout.name}
                            stackId="a"
                            fill={STAKEHOLDER_PALETTE[idx % STAKEHOLDER_PALETTE.length]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Stakeholder Payout Table */}
                {waterfallResult && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 max-h-52 overflow-y-auto space-y-2">
                    {waterfallResult.payouts.map((payout) => (
                      <div
                        key={payout.stakeholderId}
                        className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/40 last:border-0"
                      >
                        <div>
                          <span className="font-semibold text-white block">{payout.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {payout.shareClass === 'Preferred'
                              ? payout.convertedToCommon
                                ? 'Converted to Common'
                                : '1x Preference Protection'
                              : 'Common Equity'}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-emerald-400 font-bold block">
                            ${payout.totalPayout.toLocaleString()}
                          </span>
                          {payout.invested > 0 && (
                            <span className="text-[10px] text-slate-400">
                              {payout.moic.toFixed(1)}x multiple
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 8: BRING YOUR OLD DATA (IMPORT, EXPORT & SIMULATION LAUNCHPAD)
             ===================================================================== */}
          {activeTab === 'import-export' && (
            <div className="max-w-4xl space-y-6">
              {/* Simulation Launchpad (Appears when data is imported) */}
              {importedSummary && (
                <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-amber-500/10 p-6 space-y-4 shadow-lg animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">
                          Successfully Loaded Your Spreadsheet!
                        </h3>
                        <p className="text-xs text-emerald-300">
                          {importedSummary.summary.totalCount} stakeholders loaded •{' '}
                          {importedSummary.totalShares.toLocaleString()} shares •{' '}
                          ${importedSummary.totalInvested.toLocaleString()} capital
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-900 border border-slate-700 text-slate-300 px-2 py-1 rounded-full font-mono">
                      Common: {importedSummary.summary.commonCount} | Preferred: {importedSummary.summary.preferredCount}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium pt-1">
                    What would you like to simulate with your uploaded numbers?
                  </p>

                  {/* 4 Direct Simulation Action Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => {
                        setActiveTab('round-modeling');
                      }}
                      className="p-3.5 rounded-xl border border-cyan-500/40 bg-slate-950 hover:bg-cyan-500/10 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                          <TrendingUp className="h-4 w-4" />
                          <span>1. Simulate Series A Dilution</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        See how a new $5M–$10M round dilutes your uploaded common shares and converts SAFEs.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('waterfall');
                      }}
                      className="p-3.5 rounded-xl border border-amber-500/40 bg-slate-950 hover:bg-amber-500/10 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                          <Wallet className="h-4 w-4" />
                          <span>2. Simulate Exit Cash Payouts</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Drag the exit slider ($10M–$250M) to see each stakeholder's cash payout and MOIC.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('term-sheet-duel');
                      }}
                      className="p-3.5 rounded-xl border border-rose-500/40 bg-slate-950 hover:bg-rose-500/10 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                          <Swords className="h-4 w-4" />
                          <span>3. Compare 2 Term Sheets</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-rose-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Compare competing VC offers side-by-side using your uploaded cap table numbers.
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('ledger');
                      }}
                      className="p-3.5 rounded-xl border border-purple-500/40 bg-slate-950 hover:bg-purple-500/10 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                          <PieChart className="h-4 w-4" />
                          <span>4. View Clean Cap Table Ledger</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-purple-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Review ownership percentages, cost basis, and share class breakdowns in the ledger.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Upload & Paste Card */}
              <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                    <h2 className="text-base font-bold text-white">
                      Import Cap Table from Spreadsheet
                    </h2>
                  </div>
                  <button
                    onClick={downloadSampleTemplate}
                    className="flex items-center space-x-1 text-xs text-amber-300 hover:text-amber-200 underline font-medium"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Sample Template (.CSV)</span>
                  </button>
                </div>

                {/* Switch between Upload File and Paste Text */}
                <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800 w-fit text-xs">
                  <button
                    onClick={() => setImportMethodTab('upload')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                      importMethodTab === 'upload'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Upload CSV / Excel File
                  </button>
                  <button
                    onClick={() => setImportMethodTab('paste')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                      importMethodTab === 'paste'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Paste Text / Copy from Sheets
                  </button>
                </div>

                {/* Option 1: File Drop Zone */}
                {importMethodTab === 'upload' && (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".csv"
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-blue-400/60 bg-slate-950/60 rounded-xl p-8 text-center cursor-pointer transition-all space-y-2 group"
                    >
                      <Upload className="h-8 w-8 text-slate-400 group-hover:text-blue-400 mx-auto transition-colors" />
                      <span className="text-sm font-semibold text-white block">
                        Click to select your CSV export file
                      </span>
                      <span className="text-xs text-slate-400 block max-w-md mx-auto">
                        Supports standard columns: <strong>Name</strong>, <strong>Class</strong> (Common/Preferred), <strong>Shares</strong>, and <strong>Investment Amount</strong>. Handles commas and dollar signs automatically.
                      </span>
                    </div>
                  </div>
                )}

                {/* Option 2: Paste Data Directly */}
                {importMethodTab === 'paste' && (
                  <div className="space-y-3">
                    <textarea
                      rows={6}
                      placeholder={`Paste CSV data here, for example:\nElena Rostova, Common, 4500000, 4500\nMarcus Vance, Common, 3500000, 3500\nVanguard Seed, Preferred, 1000000, 1500000`}
                      value={pastedCsvText}
                      onChange={(e) => setPastedCsvText(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200 font-mono focus:border-blue-400 focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (pastedCsvText.trim()) {
                            handleProcessImportedCsv(pastedCsvText);
                          }
                        }}
                        disabled={!pastedCsvText.trim()}
                        className="flex items-center space-x-1.5 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-2 text-xs font-bold text-blue-300 hover:bg-blue-500/30 transition-all disabled:opacity-40"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Parse & Import Pasted Data</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    onClick={exportToCSV}
                    className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Current Cap Table CSV</span>
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="flex items-center space-x-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Backup State via URL Hash</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          DUE DILIGENCE ONE-PAGER MODAL
         ========================================================================= */}
      {showDueDiligenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#0c121e] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">
                  Executive Due Diligence Cap Table Summary
                </h3>
              </div>
              <button
                onClick={() => setShowDueDiligenceModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 font-mono">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Company:</span>
                  <span className="font-bold text-white">{state.companyDetails.companyName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Issued Shares:</span>
                  <span className="font-bold text-cyan-400">{totalIssuedShares.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Paid-in Capital:</span>
                  <span className="font-bold text-emerald-400">${totalCapitalInvested.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Active SAFEs:</span>
                  <span className="font-bold text-amber-300">${totalSafeCapital.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Top Equity Holders
                </span>
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Holder</th>
                        <th className="p-2 text-center">Class</th>
                        <th className="p-2 text-right">Shares</th>
                        <th className="p-2 text-right">Ownership</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {state.capTable.slice(0, 8).map((stk) => (
                        <tr key={stk.id}>
                          <td className="p-2 font-medium text-white">{stk.name}</td>
                          <td className="p-2 text-center text-slate-400">{stk.shareClass}</td>
                          <td className="p-2 text-right">{stk.shares.toLocaleString()}</td>
                          <td className="p-2 text-right text-emerald-400">
                            {totalIssuedShares > 0 ? ((stk.shares / totalIssuedShares) * 100).toFixed(2) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono">
                Verified Cryptographic State • Zero-Database
              </span>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print One-Pager</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
