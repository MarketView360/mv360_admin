"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
    fetchGenesisTickers,
    refreshGenesisTicker,
    setGenesisTickerStatus,
    addGenesisTicker,
    recomputeAllTechnicals,
    recomputeTickerTechnicals,
} from "@/lib/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Activity,
    Plus,
    RefreshCw,
    Search,
    Settings2,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Ban,
    Clock,
    TrendingUp,
    TrendingDown,
    Loader2,
    ChevronDown,
    ChevronUp
} from "lucide-react";

interface DashboardSummary {
    total: number;
    healthy: number;
    stale: number;
    errors: number;
    review: number;
}

interface Ticker {
    id: number;
    ticker: string;
    code: string;
    exchange: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
    status: string;
    fundamentals_last_ingested: string | null;
    last_updated: string | null;
    last_price: number | null;
    change_percent: number | null;
    last_price_date: string | null;
    total_data_points: number;
    indicator_count: number;
    // Extended metrics - matching backend genesis.service.ts field names
    market_cap: number | null;
    volume: number | null;
    pe: number | null;
    forward_pe: number | null;
    peg: number | null;
    pb: number | null;
    dividend_yield: number | null;
    ev_ebitda: number | null;
    price_to_sales: number | null;
    price_to_cash_flow: number | null;
    roe: number | null;
    roce: number | null;
    roa: number | null;
    opm: number | null;
    net_margin: number | null;
    debt_to_equity: number | null;
    current_ratio: number | null;
    quick_ratio: number | null;
    operating_cf: number | null;
    free_cf: number | null;
    beta: number | null;
    rsi: number | null;
    eps_ttm: number | null;
    revenue_ttm: number | null;
    sales_cagr_3y: number | null;
    profit_cagr_5y: number | null;
    price_change_1y: number | null;
}

export default function TickersPage() {
    const { session } = useAuth();
    const [loading, setLoading] = useState(true);
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchSize, setBatchSize] = useState(20); // Load 20 tickers at a time
    const [tickers, setTickers] = useState<Ticker[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [exchangeFilter, setExchangeFilter] = useState("all");
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [genesisUnavailable, setGenesisUnavailable] = useState(false);
    const [searching, setSearching] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [expandedTickerId, setExpandedTickerId] = useState<number | null>(null);
    const [isRecomputingRow, setIsRecomputingRow] = useState<string | null>(null);
    const [isBulkRecomputing, setIsBulkRecomputing] = useState(false);

    const sessionRef = useRef(session);
    useEffect(() => { sessionRef.current = session; }, [session]);

    // Abort controller for search cancellation
    const abortControllerRef = useRef<AbortController | null>(null);

    // Immediate search - pause batch loading when user types
    useEffect(() => {
        if (searchQuery.trim()) {
            setSearching(true);
            // Cancel any pending batch load
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            // Debounce slightly for immediate search
            const handler = setTimeout(() => {
                setDebouncedSearch(searchQuery);
                setPage(1);
                setBatchLoading(false);
                setSearching(false);
            }, 300);
            return () => clearTimeout(handler);
        } else {
            setSearching(false);
            if (debouncedSearch !== searchQuery) {
                setDebouncedSearch(searchQuery);
            }
        }
    }, [searchQuery]);

    // Actions state
    const [isRefreshing, setIsRefreshing] = useState<string | null>(null);

    // Dialog states
    const [addDialog, setAddDialog] = useState(false);
    const [newTickerForm, setNewTickerForm] = useState({ symbol: "", exchange: "US" });

    const [statusDialog, setStatusDialog] = useState<{ open: boolean; ticker: Ticker | null; newStatus: string }>({
        open: false,
        ticker: null,
        newStatus: ""
    });

    const loadAllTickersInBatches = async (token: string) => {
        setBatchLoading(true);
        setBatchProgress(0);
        setTickers([]);

        try {
            // First, get total count
            const initialResp = await fetchGenesisTickers(
                token,
                1,
                1, // Just get 1 to check total
                statusFilter === "all" ? "" : statusFilter,
                "",
                debouncedSearch,
                exchangeFilter === "all" ? "" : exchangeFilter
            );

            const totalItems = (initialResp as any)?.total || 0;
            const totalPages = Math.ceil(totalItems / batchSize);
            setTotalPages(totalPages);
            setTotalItems(totalItems);

            // Now load in batches
            const allTickers: Ticker[] = [];
            let lastResp: any = null;
            for (let p = 1; p <= totalPages; p++) {
                // Check if search changed during batch load
                if (searchQuery !== debouncedSearch) {
                    break; // Stop batch loading if search changed
                }

                abortControllerRef.current = new AbortController();

                const resp = await fetchGenesisTickers(
                    token,
                    p,
                    batchSize,
                    statusFilter === "all" ? "" : statusFilter,
                    "",
                    debouncedSearch,
                    exchangeFilter === "all" ? "" : exchangeFilter
                );

                lastResp = resp;
                const tickersInBatch = (resp as any)?.tickers || [];
                allTickers.push(...tickersInBatch);
                setTickers([...allTickers]);

                const progress = Math.round((p / totalPages) * 100);
                setBatchProgress(progress);

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Update summary from final batch
            if (lastResp?.summary) {
                setSummary(lastResp.summary as DashboardSummary);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Batch load error:", err);
            }
        } finally {
            setBatchLoading(false);
            setBatchProgress(0);
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const loadData = async (currentPage = page, search = debouncedSearch) => {
        const token = sessionRef.current?.access_token;
        if (!token) {
            setError("Not authenticated. Please log in.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        abortControllerRef.current = new AbortController();

        try {
            const resp = await fetchGenesisTickers(
                token,
                currentPage,
                batchSize, // Load smaller batches
                statusFilter === "all" ? "" : statusFilter,
                "", // sector
                search,
                exchangeFilter === "all" ? "" : exchangeFilter
            );

            console.log("[Tickers] API resp:", resp);

            // Check if Genesis API is unavailable
            if (resp && (resp as any).genesisUnavailable) {
                setGenesisUnavailable(true);
                setTickers([]);
                setSummary(null);
                setTotalPages(1);
                setTotalItems(0);
                setError(null);
                setLoading(false);
                return;
            }

            // Type guard to ensure resp has the expected structure
            const respAny = resp as any;
            if (resp && typeof resp === 'object' && 'tickers' in resp && Array.isArray(respAny.tickers)) {
                setTickers(respAny.tickers as Ticker[]);
                if (respAny.summary) setSummary(respAny.summary as DashboardSummary);
                setTotalPages(respAny.total_pages || 1);
                setTotalItems(respAny.total || 0);
                setGenesisUnavailable(false);
                setError(null);
            } else if (Array.isArray(resp)) {
                setTickers(resp as Ticker[]);
                setTotalPages(1);
                setTotalItems(resp.length);
                setGenesisUnavailable(false);
                setError(null);
            } else {
                setGenesisUnavailable(false);
                setError("No data available. The ticker management service may not be configured.");
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Failed to fetch tickers:", err);

                // Check for 404 - Genesis API not available
                if (err.message?.includes("404") || err.message?.includes("not found")) {
                    setGenesisUnavailable(true);
                    setTickers([]);
                    setSummary(null);
                    setError(null);
                } else {
                    setGenesisUnavailable(false);
                    setError(err.message || "Failed to fetch tickers. Please try again.");
                }
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    // Load more tickers for batch loading
    const loadMoreBatch = async () => {
        if (batchLoading || page >= totalPages || searching) return;

        const token = sessionRef.current?.access_token;
        if (!token) return;

        const nextPage = page + 1;
        setPage(nextPage);

        try {
            const resp = await fetchGenesisTickers(
                token,
                nextPage,
                batchSize,
                statusFilter === "all" ? "" : statusFilter,
                "",
                debouncedSearch,
                exchangeFilter === "all" ? "" : exchangeFilter
            );

            const respAny = resp as any;
            if (resp && typeof resp === 'object' && 'tickers' in resp && Array.isArray(respAny.tickers)) {
                setTickers(prev => [...prev, ...(respAny.tickers as Ticker[])]);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Failed to load more tickers:", err);
            }
        }
    };

    useEffect(() => {
        // Reset tickers when filters change (but not when loading more)
        if (statusFilter !== 'all' || exchangeFilter !== 'all' || debouncedSearch) {
            setTickers([]);
        }
        loadData(page, debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, statusFilter, exchangeFilter, debouncedSearch]); // Removed page from deps to avoid re-fetching on batch load

    const handleForceRefresh = async (symbol: string) => {
        const token = sessionRef.current?.access_token;
        if (!token) return;
        setIsRefreshing(symbol);
        try {
            const result = await refreshGenesisTicker(symbol, token);
            if (result) {
                // Success notification - in production use a toast library
                console.log(`Force refresh initiated for ${symbol}`);
                // Show inline success message
                setError(null);
                setTimeout(() => loadData(), 1000); // Reload after brief delay
            } else {
                throw new Error("Service unavailable");
            }
        } catch (err: any) {
            const message = err.message || "Failed to refresh ticker";
            console.error(`Refresh error for ${symbol}:`, message);
            // Show error in UI
            setError(`Failed to refresh ${symbol}: ${message}`);
        } finally {
            setIsRefreshing(null);
        }
    };

    const handleStatusChangeSubmit = async () => {
        const token = sessionRef.current?.access_token;
        if (!token || !statusDialog.ticker) return;
        try {
            const result = await setGenesisTickerStatus(statusDialog.ticker.ticker, statusDialog.newStatus, token);
            if (result) {
                setStatusDialog({ open: false, ticker: null, newStatus: "" });
                loadData();
            } else {
                throw new Error("Service unavailable");
            }
        } catch (err: any) {
            const message = err.message || "Failed to update status";
            console.error("Status change error:", message);
            setError(`Failed to update status: ${message}`);
        }
    };

    // Time formatting helper
    const formatRelative = (dateStr: string | null) => {
        if (!dateStr) return "Never";
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const handleAddSubmit = async () => {
        const token = sessionRef.current?.access_token;
        if (!token || !newTickerForm.symbol) return;
        try {
            const result = await addGenesisTicker(newTickerForm.symbol.toUpperCase(), newTickerForm.exchange, token);
            if (result) {
                setAddDialog(false);
                setNewTickerForm({ symbol: "", exchange: "US" });
                loadData();
            } else {
                throw new Error("Service unavailable");
            }
        } catch (err: any) {
            const message = err.message || "Failed to add ticker";
            console.error("Add ticker error:", message);
            setError(`Failed to add ticker: ${message}`);
        }
    };

    const handleBulkRecompute = async () => {
        const token = sessionRef.current?.access_token;
        if (!token) return;
        setIsBulkRecomputing(true);
        setError(null);
        setSuccessMsg(null);
        try {
            await recomputeAllTechnicals(token);
            setSuccessMsg("Bulk recompute started. This runs in the background and trades off local CPU for zero API calls. May take up to 2 minutes.");
        } catch (err: any) {
            console.error("Bulk recompute error:", err);
            setError(`Failed to trigger bulk recompute: ${err.message || "Unknown error"}`);
        } finally {
            setIsBulkRecomputing(false);
        }
    };

    const handleRowRecompute = async (symbol: string) => {
        const token = sessionRef.current?.access_token;
        if (!token) return;
        setIsRecomputingRow(symbol);
        setError(null);
        setSuccessMsg(null);
        try {
            await recomputeTickerTechnicals(token, symbol);
            setSuccessMsg(`Recompute started for ${symbol}. Check back shortly for updated metrics.`);
        } catch (err: any) {
            console.error(`Row recompute error for ${symbol}:`, err);
            setError(`Failed to trigger recompute for ${symbol}: ${err.message || "Unknown error"}`);
        } finally {
            setIsRecomputingRow(null);
        }
    };

    // Filter displayed tickers locally for secondary search/filter if needed, 
    // but primary search is server-side now.
    const filteredTickers = tickers.filter(t =>
        t.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    // Status badge helper
    const getStatusBadge = (ticker: Ticker) => {
        // If active but stale, color it as Stale (Warning)
        const isStale = ticker.status === 'active' &&
            (!ticker.last_updated || new Date(ticker.last_updated) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));

        switch (ticker.status) {
            case "active":
                if (isStale) return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20">Stale</Badge>;
                return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Healthy</Badge>;
            case "needs_review":
                return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">Needs Review</Badge>;
            case "error":
                return <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 text-xs text-center border">Error</Badge>;
            case "delisted":
                return <Badge variant="destructive">Delisted</Badge>;
            case "inactive":
                return <Badge variant="secondary">Inactive</Badge>;
            case "ignored":
                return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20"><Ban className="mr-1 h-3 w-3" /> Ignored</Badge>;
            default:
                return <Badge variant="outline">{ticker.status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Ticker Management</h1>
                    <p className="text-muted-foreground">Manage the market data universe</p>
                </div>
                <div className="flex gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" disabled={batchLoading || isBulkRecomputing}>
                                {isBulkRecomputing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Activity className="mr-2 h-4 w-4" />
                                )}
                                Recompute All Technicals
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-slate-800 bg-slate-950">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Recompute All Technical Indicators?</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                    This will recalculate all technical indicators (RSI, MACD, Moving Averages, etc.) for the entire active universe using existing market data.
                                    <br /><br />
                                    <strong className="text-amber-500">Note:</strong> This process consumes zero API credits but is computationally expensive. It runs asynchronously in the background and may take ~2 minutes to complete for ~4,600 tickers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-800 bg-transparent hover:bg-slate-900 text-slate-200">Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleBulkRecompute}>
                                    Start Bulk Recompute
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" onClick={() => loadData()}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => setAddDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Custom Ticker
                    </Button>
                </div>
            </div>

            {/* Genesis API Unavailable Banner */}
            {genesisUnavailable && (
                <Card className="border-amber-500/50 bg-amber-500/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-500">
                            <AlertTriangle className="h-5 w-5" />
                            Ticker Management Service Unavailable
                        </CardTitle>
                        <CardDescription className="text-amber-400/80">
                            The Genesis API service is not deployed or configured. This feature requires the Genesis service to be running.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            <p className="mb-2">To enable ticker management:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Deploy the Genesis service to your environment</li>
                                <li>Set the <code className="bg-muted px-1.5 py-0.5 rounded">NEXT_PUBLIC_GENESIS_URL</code> environment variable</li>
                                <li>Ensure the admin secret is properly configured</li>
                            </ul>
                            <p className="mt-4 text-xs">
                                In the meantime, you can still manage your application through other admin pages like Overview, Users, and Logging.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error Banner */}
            {error && !genesisUnavailable && (
                <Card className="border-red-500/50 bg-red-500/5 mb-6">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3 text-red-500">
                            <XCircle className="h-5 w-5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">Error loading tickers</p>
                                <p className="text-sm text-red-400/80">{error}</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="ml-auto"
                                onClick={() => loadData()}
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Success Banner */}
            {successMsg && !genesisUnavailable && (
                <Card className="border-emerald-500/50 bg-emerald-500/5 mb-6">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3 text-emerald-500">
                            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">Action Successful</p>
                                <p className="text-sm text-emerald-400/80">{successMsg}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto hover:bg-emerald-500/20 text-emerald-500"
                                onClick={() => setSuccessMsg(null)}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Stats - only show when Genesis is available and we have data */}
            {!genesisUnavailable && summary && (
                <div className="flex flex-wrap gap-2 mb-2 items-center justify-end">
                    <div className="flex bg-slate-900 text-slate-100 rounded-md shadow px-3 py-1.5 border border-slate-800 text-sm font-medium gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Total:</span> <span>{summary.total}</span>
                        </div>
                        <div className="w-px h-4 bg-slate-700 my-auto"></div>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                            <span>Healthy:</span> <span>{summary.healthy}</span>
                        </div>
                        <div className="w-px h-4 bg-slate-700 my-auto"></div>
                        <div className="flex items-center gap-1.5 text-yellow-500">
                            <span>Stale:</span> <span>{summary.stale}</span>
                        </div>
                        <div className="w-px h-4 bg-slate-700 my-auto"></div>
                        <div className="flex items-center gap-1.5 text-red-400">
                            <span>Errors:</span> <span>{summary.errors}</span>
                        </div>
                        <div className="w-px h-4 bg-slate-700 my-auto"></div>
                        <div className="flex items-center gap-1.5 text-blue-400">
                            <span>Review:</span> <span>{summary.review}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Loading Progress */}
            {batchLoading && (
                <Card className="border-blue-500/50 bg-blue-500/5">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-blue-500 font-medium">Loading tickers in batches...</span>
                                    <span className="text-blue-400">{batchProgress}%</span>
                                </div>
                                <Progress value={batchProgress} className="h-2" />
                                <p className="text-xs text-muted-foreground">
                                    Loaded {tickers.length} of {totalItems} tickers
                                </p>
                            </div>
                            {searching && (
                                <Button variant="outline" size="sm" onClick={() => setSearching(false)}>
                                    Cancel Search
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search symbol or name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={batchLoading}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Status:</span>
                                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); }} disabled={batchLoading}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="stale">Stale</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Exchange:</span>
                                <Select value={exchangeFilter} onValueChange={(val) => { setExchangeFilter(val); }} disabled={batchLoading}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="All Exchanges" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Exchanges</SelectItem>
                                        <SelectItem value="US">US (Misc)</SelectItem>
                                        <SelectItem value="NASDAQ">NASDAQ</SelectItem>
                                        <SelectItem value="NYSE">NYSE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Symbol</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Exchange</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead>Last Price</TableHead>
                                    <TableHead>Metrics</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {genesisUnavailable ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                                            <p className="text-lg font-medium text-foreground mb-1">Ticker Management Unavailable</p>
                                            <p className="text-sm">The Genesis API service is not configured. Please check your environment settings.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : loading && tickers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Loading tickers...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTickers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            {error ? (
                                                <>
                                                    <p className="mb-2">No data available</p>
                                                    <p className="text-xs">{error}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p>No tickers found matching your criteria.</p>
                                                    <p className="text-xs mt-1">Try adjusting your filters or search query.</p>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTickers.map((ticker) => (
                                        <React.Fragment key={ticker.id}>
                                            <TableRow>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => setExpandedTickerId(expandedTickerId === ticker.id ? null : ticker.id)}
                                                    >
                                                        {expandedTickerId === ticker.id ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-mono font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        {ticker.ticker}
                                                        {(ticker.status === 'error' || ticker.status === 'stale' || (ticker.status === 'active' && ticker.indicator_count < 10)) && (
                                                            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={ticker.name || ""}>{ticker.name || "-"}</TableCell>
                                                <TableCell>{ticker.exchange}</TableCell>
                                                <TableCell>{getStatusBadge(ticker)}</TableCell>
                                                <TableCell className="w-[120px]">
                                                    <div className="text-sm text-muted-foreground">
                                                        {formatRelative(ticker.last_updated)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="w-[120px]">
                                                    {ticker.last_price !== null ? (
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <span className="font-bold text-[15px] text-slate-100">${ticker.last_price.toFixed(2)}</span>
                                                            <span className={`text-[13px] flex items-center gap-1 font-medium ${ticker.change_percent && ticker.change_percent > 0 ? 'text-emerald-500' : (ticker.change_percent && ticker.change_percent < 0 ? 'text-red-500' : 'text-slate-400')}`}>
                                                                {ticker.change_percent && ticker.change_percent > 0 ? (
                                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                                ) : ticker.change_percent && ticker.change_percent < 0 ? (
                                                                    <TrendingDown className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <span className="w-3.5 h-[2px] bg-slate-400 rounded-full" />
                                                                )}
                                                                {ticker.change_percent ? (ticker.change_percent > 0 ? `+${ticker.change_percent.toFixed(2)}` : ticker.change_percent.toFixed(2)) : '0.00'}%
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground block">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="w-[150px]">
                                                    <div className="flex flex-wrap gap-1">
                                                        {ticker.pe && (
                                                            <span className="text-xs bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded" title="P/E Ratio">P/E: {ticker.pe.toFixed(1)}</span>
                                                        )}
                                                        {ticker.market_cap && (
                                                            <span className="text-xs bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded" title="Market Cap">MC: {(ticker.market_cap / 1e9).toFixed(1)}B</span>
                                                        )}
                                                        {ticker.dividend_yield && (
                                                            <span className="text-xs bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded" title="Dividend Yield">Div: {ticker.dividend_yield.toFixed(2)}%</span>
                                                        )}
                                                        {ticker.roe && (
                                                            <span className="text-xs bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded" title="ROE">ROE: {ticker.roe.toFixed(1)}%</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={isRefreshing === ticker.ticker}
                                                            onClick={() => handleForceRefresh(ticker.ticker)}
                                                            title="Force Refresh Data"
                                                        >
                                                            <RefreshCw className={`h-4 w-4 ${isRefreshing === ticker.ticker ? "animate-spin" : ""}`} />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setStatusDialog({ open: true, ticker, newStatus: ticker.status })}
                                                            title="Change Status"
                                                        >
                                                            <Settings2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {expandedTickerId === ticker.id && (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="p-4">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-muted/50 rounded-lg">
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Market Cap</p>
                                                                <p className="text-sm font-semibold">{ticker.market_cap ? `$${(ticker.market_cap / 1e9).toFixed(2)}B` : 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">P/E Ratio</p>
                                                                <p className="text-sm font-semibold">{ticker.pe?.toFixed(2) ?? 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">P/B Ratio</p>
                                                                <p className="text-sm font-semibold">{ticker.pb?.toFixed(2) ?? 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Dividend Yield</p>
                                                                <p className="text-sm font-semibold">{ticker.dividend_yield?.toFixed(2) ?? 'N/A'}%</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">ROE</p>
                                                                <p className="text-sm font-semibold">{ticker.roe?.toFixed(2) ?? 'N/A'}%</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Debt/Equity</p>
                                                                <p className="text-sm font-semibold">{ticker.debt_to_equity?.toFixed(2) ?? 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Current Ratio</p>
                                                                <p className="text-sm font-semibold">{ticker.current_ratio?.toFixed(2) ?? 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Operating CF</p>
                                                                <p className="text-sm font-semibold">{ticker.operating_cf ? `$${(ticker.operating_cf / 1e6).toFixed(1)}M` : 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Free CF</p>
                                                                <p className="text-sm font-semibold">{ticker.free_cf ? `$${(ticker.free_cf / 1e6).toFixed(1)}M` : 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Beta</p>
                                                                <p className="text-sm font-semibold">{ticker.beta?.toFixed(2) ?? 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">RSI</p>
                                                                <p className="text-sm font-semibold">{ticker.rsi?.toFixed(1) ?? 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">EPS (TTM)</p>
                                                                <p className="text-sm font-semibold">{ticker.eps_ttm ? `$${ticker.eps_ttm.toFixed(2)}` : 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Revenue (TTM)</p>
                                                                <p className="text-sm font-semibold">{ticker.revenue_ttm ? `$${(ticker.revenue_ttm / 1e9).toFixed(2)}B` : 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Net Margin</p>
                                                                <p className="text-sm font-semibold">{ticker.net_margin?.toFixed(2) ?? 'N/A'}%</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">1Y Change</p>
                                                                <p className={`text-sm font-semibold ${ticker.price_change_1y && ticker.price_change_1y > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                    {ticker.price_change_1y ? `${ticker.price_change_1y > 0 ? '+' : ''}${ticker.price_change_1y.toFixed(2)}%` : 'N/A'}
                                                                </p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Data Points</p>
                                                                <p className="text-sm font-semibold">{ticker.total_data_points.toLocaleString()}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-muted-foreground">Last Price Date</p>
                                                                <p className="text-sm font-semibold">{ticker.last_price_date || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 flex justify-end">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleRowRecompute(ticker.ticker)}
                                                                disabled={isRecomputingRow === ticker.ticker}
                                                                className="text-xs bg-slate-900 border-slate-700 hover:bg-slate-800"
                                                            >
                                                                {isRecomputingRow === ticker.ticker ? (
                                                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Activity className="mr-2 h-3.5 w-3.5" />
                                                                )}
                                                                Recompute Indicators
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Load More Button */}
                    {!batchLoading && tickers.length < totalItems && (
                        <div className="mt-4 flex justify-center">
                            <Button
                                variant="outline"
                                onClick={loadMoreBatch}
                                disabled={loading}
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                                Load More ({tickers.length} / {totalItems})
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add manually Dialog */}
            <Dialog open={addDialog} onOpenChange={setAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Custom Ticker</DialogTitle>
                        <DialogDescription>
                            Manually add a ticker symbol to the ingestion universe. It will be verified against EODHD automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Symbol</label>
                            <Input
                                placeholder="e.g. AAPL"
                                value={newTickerForm.symbol}
                                onChange={(e) => setNewTickerForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Exchange Code</label>
                            <Input
                                placeholder="e.g. US"
                                value={newTickerForm.exchange}
                                onChange={(e) => setNewTickerForm(prev => ({ ...prev, exchange: e.target.value.toUpperCase() }))}
                            />
                            <p className="text-xs text-muted-foreground">Leave as 'US' for standard US stocks.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
                        <Button onClick={handleAddSubmit} disabled={!newTickerForm.symbol}>Add Ticker</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Change Status Dialog */}
            <Dialog open={statusDialog.open} onOpenChange={(open) => !open && setStatusDialog(prev => ({ ...prev, open: false }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Ticker Status: {statusDialog.ticker?.ticker}</DialogTitle>
                        <DialogDescription>
                            Changing the status affects whether this ticker is ingested and processed by pipelines.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Status</label>
                            <Select
                                value={statusDialog.newStatus}
                                onValueChange={(val) => setStatusDialog(prev => ({ ...prev, newStatus: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active (Ingest Normal)</SelectItem>
                                    <SelectItem value="needs_review">Needs Review (Temporarily Stopped)</SelectItem>
                                    <SelectItem value="delisted">Delisted (Permanently Ignored)</SelectItem>
                                    <SelectItem value="ignored">Ignored (Skipped from Universe)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                        <Button onClick={handleStatusChangeSubmit}>Save Status</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
