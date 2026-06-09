"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Stats {
  users: { total: number; free: number; growth: number; unlimited: number; blocked: number; todaySignups: number };
  videos: { total: number };
  queues: { video: Record<string, number>; ai: Record<string, number> };
}

interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  subscriptionTier: string;
  videosThisMonth: number;
  totalGenerations: number;
  videoQuota: number;
  isBlocked: boolean;
  blockReason: string | null;
  adminNotes: string | null;
  createdAt: string;
  workspace: { type: string; businessName: string | null } | null;
}

type Tab = "overview" | "users" | "email";

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [blockedFilter, setBlockedFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [newCampaign, setNewCampaign] = useState({ subject: "", body: "", targetTier: "", targetCategory: "" });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://myna-production-d05b.up.railway.app";

  function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  }

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const token = getToken();
    if (!token) { router.push("/admin/login"); throw new Error("No token"); }
    const res = await fetch(url, {
      ...opts,
      headers: { ...opts.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (res.status === 401) { router.push("/admin/login"); throw new Error("Unauthorized"); }
    return res;
  }, [router]);

  useEffect(() => {
    if (!getToken()) { router.push("/admin/login"); return; }
    authFetch(`${apiUrl}/admin/api/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, [apiUrl, authFetch, router]);

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);
    if (tierFilter) params.set("tier", tierFilter);
    if (blockedFilter) params.set("blocked", "true");
    const res = await authFetch(`${apiUrl}/admin/api/users?${params}`);
    const data = await res.json();
    setUsers(data.users || []);
    setTotalUsers(data.total || 0);
  }, [page, search, tierFilter, blockedFilter, apiUrl, authFetch]);

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab, loadUsers]);

  useEffect(() => {
    if (tab === "email") {
      authFetch(`${apiUrl}/admin/api/email/campaigns`).then(r => r.json()).then(setCampaigns).catch(() => {});
    }
  }, [tab, apiUrl, authFetch]);

  async function blockUser(userId: string, reason: string) {
    setActionLoading(true);
    await authFetch(`${apiUrl}/admin/api/users/${userId}/block`, { method: "POST", body: JSON.stringify({ reason }) });
    setActionLoading(false);
    setSelectedUser(null);
    loadUsers();
  }

  async function unblockUser(userId: string) {
    setActionLoading(true);
    await authFetch(`${apiUrl}/admin/api/users/${userId}/unblock`, { method: "POST", body: JSON.stringify({}) });
    setActionLoading(false);
    setSelectedUser(null);
    loadUsers();
  }

  async function changeTier(userId: string, tier: string) {
    setActionLoading(true);
    await authFetch(`${apiUrl}/admin/api/users/${userId}/tier`, { method: "PATCH", body: JSON.stringify({ tier }) });
    setActionLoading(false);
    setSelectedUser(null);
    loadUsers();
  }

  async function sendMessage(userId: string) {
    if (!messageText.trim()) return;
    setActionLoading(true);
    await authFetch(`${apiUrl}/admin/api/users/${userId}/message`, { method: "POST", body: JSON.stringify({ text: messageText }) });
    setActionLoading(false);
    setMessageText("");
    alert("Message sent!");
  }

  async function createCampaign() {
    if (!newCampaign.subject || !newCampaign.body) return alert("Subject and body required");
    await authFetch(`${apiUrl}/admin/api/email/campaigns`, { method: "POST", body: JSON.stringify(newCampaign) });
    setNewCampaign({ subject: "", body: "", targetTier: "", targetCategory: "" });
    authFetch(`${apiUrl}/admin/api/email/campaigns`).then(r => r.json()).then(setCampaigns).catch(() => {});
  }

  async function sendCampaign(id: string) {
    if (!confirm("Send this campaign now?")) return;
    const res = await authFetch(`${apiUrl}/admin/api/email/campaigns/${id}/send`, { method: "POST", body: JSON.stringify({}) });
    const data = await res.json();
    alert(`Sent to ${data.sentCount} users`);
    authFetch(`${apiUrl}/admin/api/email/campaigns`).then(r => r.json()).then(setCampaigns).catch(() => {});
  }

  const tierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      FREE: "bg-gray-500/20 text-gray-400",
      GROWTH: "bg-green-500/20 text-green-400",
      UNLIMITED: "bg-purple-500/20 text-purple-400",
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[tier] || "bg-gray-500/20 text-gray-400"}`}>{tier}</span>;
  };

  function logout() {
    localStorage.removeItem("adminToken");
    router.push("/admin/login");
  }

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold gradient-text">Myna Admin</span>
          <div className="flex items-center gap-4">
            <a href="/admin/queues" target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-white">
              Queue Monitor â†—
            </a>
            <button onClick={logout} className="text-xs text-gray-500 hover:text-red-400">Sign out</button>
          </div>
        </div>
      </nav>

      <div className="pt-14 max-w-7xl mx-auto px-6 py-8">
        {/* Tab nav */}
        <div className="flex gap-1 mb-8 border-b border-white/10 pb-0">
          {(["overview", "users", "email"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-green-500 text-green-400" : "border-transparent text-gray-400 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: stats.users.total },
                { label: "Today Signups", value: stats.users.todaySignups },
                { label: "Paying Users", value: stats.users.growth + stats.users.unlimited },
                { label: "Videos Generated", value: stats.videos.total },
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-4 border border-white/10">
                  <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: "Free Users", value: stats.users.free, color: "text-gray-400" },
                { label: "Growth Users", value: stats.users.growth, color: "text-green-400" },
                { label: "Unlimited Users", value: stats.users.unlimited, color: "text-purple-400" },
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-4 border border-white/10 flex justify-between items-center">
                  <span className="text-sm text-gray-400">{s.label}</span>
                  <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
            {stats.users.blocked > 0 && (
              <div className="glass rounded-xl p-4 border border-red-500/20 flex justify-between items-center">
                <span className="text-sm text-gray-400">Blocked Accounts</span>
                <span className="text-xl font-bold text-red-400">{stats.users.blocked}</span>
              </div>
            )}
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search name, phone, email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 w-64"
              />
              <select
                value={tierFilter}
                onChange={e => { setTierFilter(e.target.value); setPage(1); }}
                className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option value="">All tiers</option>
                <option value="FREE">Free</option>
                <option value="GROWTH">Growth</option>
                <option value="UNLIMITED">Unlimited</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" checked={blockedFilter} onChange={e => setBlockedFilter(e.target.checked)} className="accent-green-500" />
                Blocked only
              </label>
              <span className="text-sm text-gray-500 self-center">{totalUsers} total</span>
            </div>

            {/* Table */}
            <div className="glass rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-gray-400 text-xs">
                      <th className="p-3">User</th>
                      <th className="p-3">Workspace</th>
                      <th className="p-3">Tier</th>
                      <th className="p-3">Usage</th>
                      <th className="p-3">Joined</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className={`border-b border-white/5 hover:bg-white/3 ${user.isBlocked ? "opacity-50" : ""}`}>
                        <td className="p-3">
                          <div className="font-medium text-white">{user.name || "â€”"}</div>
                          <div className="text-xs text-gray-500">{user.phone}</div>
                          {user.email && <div className="text-xs text-gray-600">{user.email}</div>}
                          {user.isBlocked && <span className="text-xs text-red-400">â›” Blocked</span>}
                        </td>
                        <td className="p-3 text-gray-400 text-xs">
                          {user.workspace ? (
                            <>
                              <div>{user.workspace.type}</div>
                              {user.workspace.businessName && <div className="text-gray-500">{user.workspace.businessName}</div>}
                            </>
                          ) : "â€”"}
                        </td>
                        <td className="p-3">{tierBadge(user.subscriptionTier)}</td>
                        <td className="p-3 text-xs text-gray-400">
                          <div>{user.videosThisMonth} / {user.videoQuota === -1 ? "âˆž" : user.videoQuota} this month</div>
                          <div className="text-gray-600">{user.totalGenerations} lifetime</div>
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-xs text-gray-400 disabled:opacity-30 hover:text-white">â† Prev</button>
              <span className="text-xs text-gray-500">Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={users.length < 50} className="text-xs text-gray-400 disabled:opacity-30 hover:text-white">Next â†’</button>
            </div>
          </div>
        )}

        {/* EMAIL CAMPAIGNS */}
        {tab === "email" && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Create campaign */}
            <div className="glass rounded-xl p-6 border border-white/10 space-y-4">
              <h2 className="font-semibold">New Campaign</h2>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Subject</label>
                <input value={newCampaign.subject} onChange={e => setNewCampaign(c => ({ ...c, subject: e.target.value }))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                  placeholder="Subject line" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Body (HTML ok, use {"{{name}}"} for name)</label>
                <textarea value={newCampaign.body} onChange={e => setNewCampaign(c => ({ ...c, body: e.target.value }))}
                  rows={6}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                  placeholder="Hi {{name}}, ..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target Tier (optional)</label>
                  <select value={newCampaign.targetTier} onChange={e => setNewCampaign(c => ({ ...c, targetTier: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-green-500">
                    <option value="">All tiers</option>
                    <option value="FREE">Free</option>
                    <option value="GROWTH">Growth</option>
                    <option value="UNLIMITED">Unlimited</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target Category (optional)</label>
                  <select value={newCampaign.targetCategory} onChange={e => setNewCampaign(c => ({ ...c, targetCategory: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-green-500">
                    <option value="">All categories</option>
                    <option value="HIGH_VALUE">High Value</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="STANDARD">Standard</option>
                    <option value="PERSONAL">Personal</option>
                  </select>
                </div>
              </div>
              <button onClick={createCampaign} className="bg-green-500 hover:bg-green-400 text-gray-950 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                Save Campaign
              </button>
            </div>

            {/* Campaign list */}
            <div className="space-y-3">
              <h2 className="font-semibold">Campaigns</h2>
              {campaigns.length === 0 && <p className="text-sm text-gray-500">No campaigns yet.</p>}
              {campaigns.map(c => (
                <div key={c.id} className="glass rounded-xl p-4 border border-white/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{c.subject}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {c.status === "SENT" ? `Sent to ${c.sentCount} users Â· ${new Date(c.sentAt).toLocaleDateString()}` : "Draft"}
                        {c.targetTier && ` Â· ${c.targetTier}`}
                        {c.targetCategory && ` Â· ${c.targetCategory}`}
                      </div>
                    </div>
                    {c.status !== "SENT" && (
                      <button onClick={() => sendCampaign(c.id)}
                        className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1 rounded-lg transition-colors">
                        Send
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={() => setSelectedUser(null)}>
          <div className="glass rounded-2xl p-6 border border-white/10 w-full max-w-md space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{selectedUser.name || "Unknown"}</h3>
                <div className="text-xs text-gray-400 mt-0.5">{selectedUser.phone}</div>
              </div>
              {tierBadge(selectedUser.subscriptionTier)}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
              <div>Videos this month: <span className="text-white">{selectedUser.videosThisMonth}</span></div>
              <div>Lifetime: <span className="text-white">{selectedUser.totalGenerations}</span></div>
              <div>Workspace: <span className="text-white">{selectedUser.workspace?.type || "â€”"}</span></div>
              <div>Status: <span className={selectedUser.isBlocked ? "text-red-400" : "text-green-400"}>{selectedUser.isBlocked ? "Blocked" : "Active"}</span></div>
            </div>

            {selectedUser.blockReason && (
              <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2">Block reason: {selectedUser.blockReason}</div>
            )}

            {/* Change tier */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Change Tier</label>
              <div className="flex gap-2">
                {["FREE", "GROWTH", "UNLIMITED"].map(t => (
                  <button key={t} onClick={() => changeTier(selectedUser.id, t)} disabled={actionLoading || selectedUser.subscriptionTier === t}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-white/20 hover:border-green-500/50 hover:text-green-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Send WA message */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Send WhatsApp Message</label>
              <div className="flex gap-2">
                <input value={messageText} onChange={e => setMessageText(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
                  placeholder="Message to user..." />
                <button onClick={() => sendMessage(selectedUser.id)} disabled={actionLoading}
                  className="bg-green-500/20 text-green-400 text-xs px-3 rounded-lg hover:bg-green-500/30 transition-colors">
                  Send
                </button>
              </div>
            </div>

            {/* Block/Unblock */}
            <div className="flex gap-3 pt-2">
              {selectedUser.isBlocked ? (
                <button onClick={() => unblockUser(selectedUser.id)} disabled={actionLoading}
                  className="flex-1 bg-green-500/20 text-green-400 text-sm font-medium py-2 rounded-lg hover:bg-green-500/30 transition-colors">
                  Unblock User
                </button>
              ) : (
                <button
                  onClick={() => {
                    const reason = prompt("Block reason:");
                    if (reason !== null) blockUser(selectedUser.id, reason);
                  }}
                  disabled={actionLoading}
                  className="flex-1 bg-red-500/20 text-red-400 text-sm font-medium py-2 rounded-lg hover:bg-red-500/30 transition-colors">
                  Block User
                </button>
              )}
              <button onClick={() => setSelectedUser(null)} className="px-4 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
