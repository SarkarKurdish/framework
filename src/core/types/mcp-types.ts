export interface MCPConfig {
    enabled: boolean
    path?: string
}

export type MCPMethod = 'initialize' | 'tools/list' | 'tools/call'

export interface MCPRequest {
    jsonrpc: '2.0'
    id: string | number
    method: MCPMethod | string
    params?: unknown
}

export interface MCPResponse {
    jsonrpc: '2.0'
    id: string | number | null
    result?: unknown
    error?: {
        code: number
        message: string
        data?: unknown
    }
}
