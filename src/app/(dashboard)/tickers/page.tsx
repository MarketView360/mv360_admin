"use client";

import { useEffect, useState } from "react";
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
    Ban
} from "lucide-react";

interface Ticker {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export default function TickersPage() {
    const { session } = useAuth();
    const [loading, setLoading] = useState(true);
    const [tickers, setTickers] = useState<Ticker[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

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

    const loadData = async (currentPage = page) => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const resp = await fetchGenesisTickers(
                session.access_token,
                currentPage,
                50,
                statusFilter === "all" ? "" : statusFilter
            );

            // The API currently returns an array directly, or an object with data/total.
            // We'll handle both just in case:
            if (Array.isArray(resp)) {
                setTickers(resp);
                setTotalPages(1);
            } else if (resp.data) {
                setTickers(resp.data);
                setTotalPages(resp.total_pages || 1);
            }
        } catch (err) {
            console.error("Failed to fetch tickers:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, page, statusFilter]);

    const handleForceRefresh = async (symbol: string) => {
        if (!session?.access_token) return;
        setIsRefreshing(symbol);
        try {
            await refreshGenesisTicker(symbol, session.access_token);
            alert(`Force refresh initiated for ${symbol}`);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsRefreshing(null);
        }
    };

    const handleStatusChangeSubmit = async () => {
        if (!session?.access_token || !statusDialog.ticker) return;
        try {
            await setGenesisTickerStatus(statusDialog.ticker.symbol, statusDialog.newStatus, session.access_token);
            setStatusDialog({ open: false, ticker: null, newStatus: "" });
            loadData();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleAddSubmit = async () => {
        if (!session?.access_token || !newTickerForm.symbol) return;
        try {
            await addGenesisTicker(newTickerForm.symbol.toUpperCase(), newTickerForm.exchange, session.access_token);
            setAddDialog(false);
            setNewTickerForm({ symbol: "", exchange: "US" });
            loadData();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const filteredTickers = tickers.filter(t =>
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="mr-1 h-3 w-3" /> Active</Badge>;
            case "needs_review":
                return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertTriangle className="mr-1 h-3 w-3" /> Needs Review</Badge>;
            case "delisted":
                return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="mr-1 h-3 w-3" /> Delisted</Badge>;
            case "ignored":
                return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20"><Ban className="mr-1 h-3 w-3" /> Ignored</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
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
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="needs_review">Needs Review</SelectItem>
                                    <SelectItem value="delisted">Delisted</SelectItem>
                                    <SelectItem value="ignored">Ignored</SelectItem>
                                </SelectContent>
                            </Select>
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
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && tickers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Loading tickers...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTickers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No tickers found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTickers.map((ticker) => (
                                        <TableRow key={ticker.symbol}>
                                            <TableCell className="font-mono font-medium">{ticker.symbol}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={ticker.name}>{ticker.name || "-"}</TableCell>
                                            <TableCell>{ticker.exchange}</TableCell>
                                            <TableCell>{ticker.type || "Common Stock"}</TableCell>
                                            <TableCell>{getStatusBadge(ticker.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={isRefreshing === ticker.symbol}
                                                        onClick={() => handleForceRefresh(ticker.symbol)}
                                                        title="Force Refresh Data"
                                                    >
                                                        <RefreshCw className={`h-4 w-4 ${isRefreshing === ticker.symbol ? "animate-spin" : ""}`} />
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
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1 || loading}>
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages || loading}>
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
                        <DialogTitle>Set Ticker Status: {statusDialog.ticker?.symbol}</DialogTitle>
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
