"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
    fetchGenesisTickers,
    refreshGenesisTicker,
    setGenesisTickerStatus,
    addGenesisTicker,
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
    TrendingDown
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
}

export default function TickersPage() {
    const { session } = useAuth();
    const [loading, setLoading] = useState(true);
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

    const sessionRef = useRef(session);
    useEffect(() => { sessionRef.current = session; }, [session]);

    // Debounce search query to avoid spamming the backend
    useEffect(() => {
        const handler = setTimeout(() => {
            if (debouncedSearch !== searchQuery) {
                setDebouncedSearch(searchQuery);
                setPage(1); // Reset to page 1 on new search
            }
        }, 400);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const loadData = async (currentPage = page, search = debouncedSearch) => {
        const token = sessionRef.current?.access_token;
        if (!token) return;
        setLoading(true);
        try {
            const resp = await fetchGenesisTickers(
                token,
                currentPage,
                100,
                statusFilter === "all" ? "" : statusFilter,
                "", // sector
                search,
                exchangeFilter === "all" ? "" : exchangeFilter
            );

            console.log("[Tickers] API resp:", resp);

            if (resp && resp.tickers) {
                setTickers(resp.tickers);
                if (resp.summary) setSummary(resp.summary);
                setTotalPages(resp.total_pages || 1);
                setTotalItems(resp.total || 0);
                setError(null);
            } else if (Array.isArray(resp)) {
                setTickers(resp);
                setTotalPages(1);
                setTotalItems(resp.length);
                setError(null);
            } else {
                setError(`Unexpected response format: ${JSON.stringify(resp).slice(0, 200)}`);
            }
        } catch (err: any) {
            console.error("Failed to fetch tickers:", err);
            setError(err.message || "Failed to fetch tickers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(page, debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, page, statusFilter, exchangeFilter, debouncedSearch]); // re-run when filters or search change

    const handleForceRefresh = async (symbol: string) => {
        const token = sessionRef.current?.access_token;
        if (!token) return;
        setIsRefreshing(symbol);
        try {
            await refreshGenesisTicker(symbol, token);
            alert(`Force refresh initiated for ${symbol}`);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsRefreshing(null);
        }
    };

    const handleStatusChangeSubmit = async () => {
        const token = sessionRef.current?.access_token;
        if (!token || !statusDialog.ticker) return;
        try {
            await setGenesisTickerStatus(statusDialog.ticker.ticker, statusDialog.newStatus, token);
            setStatusDialog({ open: false, ticker: null, newStatus: "" });
            loadData();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
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
            await addGenesisTicker(newTickerForm.symbol.toUpperCase(), newTickerForm.exchange, token);
            setAddDialog(false);
            setNewTickerForm({ symbol: "", exchange: "US" });
            loadData();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
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

            {summary && (
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

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search symbol or name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Status:</span>
                                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="needs_review">Needs Review</SelectItem>
                                        <SelectItem value="error">Error</SelectItem>
                                        <SelectItem value="delisted">Delisted</SelectItem>
                                        <SelectItem value="ignored">Ignored</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Exchange:</span>
                                <Select value={exchangeFilter} onValueChange={(val) => { setExchangeFilter(val); setPage(1); }}>
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
                                    <TableHead>Symbol</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Exchange</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Ingested</TableHead>
                                    <TableHead>Last Price</TableHead>
                                    <TableHead>Data Points</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && tickers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Loading tickers...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTickers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No tickers found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTickers.map((ticker) => (
                                        <TableRow key={ticker.id}>
                                            <TableCell className="font-mono font-medium">
                                                <div className="flex items-center gap-1.5">
                                                    {ticker.ticker}
                                                    {(ticker.status === 'error' || ticker.status === 'needs_review' || (ticker.status === 'active' && ticker.indicator_count < 10) || ticker.status === 'stale') && (
                                                        <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={ticker.name || ""}>{ticker.name || "-"}</TableCell>
                                            <TableCell>{ticker.exchange}</TableCell>
                                            <TableCell>{getStatusBadge(ticker)}</TableCell>
                                            <TableCell className="w-[180px]">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="grid grid-cols-[40px_1fr] items-center gap-2">
                                                        <span className="text-muted-foreground text-[12px]">Daily:</span>
                                                        <span className="font-medium text-slate-100 bg-slate-800/80 border border-slate-700/60 rounded px-2 py-[1px] truncate text-center text-[12px]">{formatRelative(ticker.last_price_date)}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[40px_1fr] items-center gap-2">
                                                        <span className="text-muted-foreground text-[12px]">Fund:</span>
                                                        <span className="font-medium text-slate-100 bg-slate-800/80 border border-slate-700/60 rounded px-2 py-[1px] truncate text-center text-[12px]">{formatRelative(ticker.fundamentals_last_ingested)}</span>
                                                    </div>
                                                    <div className="grid grid-cols-[40px_1fr] items-center gap-2">
                                                        <span className="text-muted-foreground text-[12px]">Meta:</span>
                                                        <span className="font-medium text-slate-100 bg-slate-800/80 border border-slate-700/60 rounded px-2 py-[1px] truncate text-center text-[12px]">{formatRelative(ticker.last_updated)}</span>
                                                    </div>
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
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5 items-start text-xs text-muted-foreground">
                                                    <span>{ticker.total_data_points ? ticker.total_data_points.toLocaleString() : "0"}</span>
                                                    <span>{ticker.indicator_count} indicators</span>
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
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 px-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                Shown {tickers.length} of {totalItems > 0 ? totalItems : "many"}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1 || loading}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm px-2">Page {page} of {totalPages}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages || loading}
                                >
                                    Next
                                </Button>
                            </div>
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
