// This is an in-memory store for the MVP.
// In a production serverless environment, this should be replaced by Redis or a database.

export interface ServerMetrics {
    cpu: {
        cores: number;
        global_usage: number;
        per_core: number[];
    };
    disks: {
        device: string;
        fstype: string;
        path: string;
        total: number;
        used: number;
        used_percent: number;
    }[];
    host: {
        load_1: number;
        load_15: number;
        load_5: number;
        procs: number;
        temperatures: {
            key: string;
            temperature: number;
        }[];
        uptime: number;
    };
    memory: {
        swap_total: number;
        swap_used: number;
        total: number;
        used: number;
        used_percent: number;
    };
    network: {
        bytes_recv: number;
        bytes_sent: number;
        errors: number;
        name: string;
        packets_recv: number;
        packets_sent: number;
    }[];
    timestamp: number;
}

export interface ServerData {
    secretKey: string;
    hostname: string;
    username: string;
    ip: string;
    lastMetrics?: ServerMetrics;
    lastSeen?: number;
}

// Global store
// Typescript workaround to prevent garbage collection in dev HMR if we were using a true global, 
// but for a simple object export this usually persists in the module cache until file change.
// To be ultra-safe in 'next dev', we can attach it to globalThis.

const globalStore = globalThis as unknown as { serverStore: Record<string, ServerData> };

if (!globalStore.serverStore) {
    globalStore.serverStore = {};
}

export const serverStore = globalStore.serverStore;

export function generateServerID(hostname: string, username: string, ip: string) {
    return `server_${hostname}_${username}_${ip}`;
}
