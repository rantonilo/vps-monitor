"use client";

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Cpu, HardDrive, Network, Server as ServerIcon, Thermometer, LogOut, Copy } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { signOut } from "next-auth/react";
import { useState } from 'react';
import { ModeToggle } from '@/components/mode-toggle';

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => {
  if (res.status === 401) window.location.href = "/login";
  return res.json();
});

interface ServerData {
  server_id: string;
  hostname: string;
  username: string;
  ip: string;
  lastSeen: number;
  lastMetrics: any; // Using any for simplicity as structure matches backend
}

export default function Dashboard() {
  const { data: servers, error } = useSWR<ServerData[]>('/api/stats', fetcher, { refreshInterval: 2000 });
  const { data: tokenData } = useSWR('/api/user/token', fetcher);
  const [copied, setCopied] = useState(false);

  const copyToken = () => {
    if (tokenData?.token) {
      navigator.clipboard.writeText(tokenData.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (error) return <div className="p-10 text-red-500">Failed to load server data.</div>;
  if (!servers) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <header className="mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            VPS Monitor
          </h1>
          <p className="text-muted-foreground mt-2">Real-time infrastructure monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          {tokenData?.token && (
            <div className="flex items-center gap-2 bg-card border px-4 py-2 rounded-lg">
              <span className="text-xs text-muted-foreground uppercase font-bold">Install Token:</span>
              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded blur-[2px] hover:blur-0 transition-all cursor-text select-all">
                {tokenData.token}
              </code>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={copyToken}>
                <Copy className="w-4 h-4" />
              </Button>
              {copied && <span className="text-xs text-green-500">Copied!</span>}
            </div>
          )}
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      {servers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ServerIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">No servers connected.</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            To add a server, run the agent with your install token found above.
            <br />
            <code>./monitor-agent --token YOUR_TOKEN</code>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {servers.map((server) => (
            <ServerCard key={server.server_id} server={server} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServerCard({ server }: { server: ServerData }) {
  if (!server.lastMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{server.hostname}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Waiting for metrics...</p>
        </CardContent>
      </Card>
    )
  }

  const { cpu, memory, disks, host, network } = server.lastMetrics;
  const loadColor = host.load_1 > cpu.cores ? "text-red-500" : "text-green-400";
  const temp = host.temperatures.find((t: any) => t.temperature > 0)?.temperature || 0;

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4">
        <div>
          <div className="flex items-center gap-3">
            <ServerIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold">{server.hostname}</h2>
            <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">{server.ip}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 pl-9">
            Uptime: {(host.uptime / 3600).toFixed(1)}h • Tasks: {host.procs} • Load: <span className={loadColor}>{host.load_1}</span>
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-orange-500" />
            <span className="text-xl font-mono">{temp}°C</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* CPU */}
        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-muted-foreground text-sm font-semibold flex items-center gap-2">
              <Cpu className="w-4 h-4" /> CPU USAGE
            </h3>
            <span className="text-2xl font-bold text-blue-400">{cpu.global_usage.toFixed(1)}%</span>
          </div>

          <div className="grid grid-cols-4 gap-1 mt-2">
            {cpu.per_core.map((core: number, i: number) => (
              <div key={i} className="h-8 bg-muted rounded relative overflow-hidden group" title={`Core ${i}: ${core.toFixed(1)}%`}>
                <div
                  className="absolute bottom-0 w-full bg-blue-500 transition-all duration-500"
                  style={{ height: `${core}%` }}
                ></div>
              </div>
            ))}
          </div>
        </div>

        {/* RAM */}
        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-muted-foreground text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" /> MEMORY
            </h3>
            <span className="text-2xl font-bold text-purple-400">{memory.used_percent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden mb-2">
            <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${memory.used_percent}%` }}></div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{(memory.used / 1024 / 1024 / 1024).toFixed(1)} GB Used</span>
            <span>{(memory.total / 1024 / 1024 / 1024).toFixed(1)} GB Total</span>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Swap: {((memory.swap_used / memory.swap_total) * 100 || 0).toFixed(1)}%
          </div>
        </div>

        {/* Disk - UPDATED WITH TOOLTIP */}
        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-muted-foreground text-sm font-semibold flex items-center gap-2">
              <HardDrive className="w-4 h-4" /> DISK (root)
            </h3>
          </div>
          {disks.filter((d: any) => d.path === '/').map((disk: any) => (
            <div key={disk.device} className="relative h-24 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Used', value: disk.used },
                      { name: 'Free', value: disk.total - disk.used }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={35}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#374151" />
                  </Pie>
                  <RechartsTooltip
                    itemStyle={{ color: '#fff' }}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px' }}
                    formatter={(value: number) => (value / 1024 / 1024 / 1024).toFixed(1) + ' GB'}
                    labelFormatter={() => disk.path}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm font-bold text-emerald-400">{disk.used_percent.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Network */}
        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-muted-foreground text-sm font-semibold flex items-center gap-2">
              <Network className="w-4 h-4" /> NETWORK
            </h3>
          </div>
          <div className="space-y-3">
            {network.filter((n: any) => n.name !== 'lo' && (n.bytes_recv > 0 || n.bytes_sent > 0)).slice(0, 2).map((net: any) => (
              <div key={net.name} className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">{net.name}</span>
                <div className="text-right">
                  <div className="text-blue-400">↓ {(net.bytes_recv / 1024 / 1024).toFixed(1)} MB</div>
                  <div className="text-green-400">↑ {(net.bytes_sent / 1024 / 1024).toFixed(1)} MB</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
