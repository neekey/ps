interface PSLookupQuery {
    command?: string;
    arguments?: string;
    pid?: number;
}

interface PSLookupResult{
    pid: number,
    command: string,
    arguments?: string,
    ppid: number
}

interface Signal{
    signal: string,
    timeout: number,
}

export function lookupPromise(
    query: PSLookupQuery): Promise<PSLookupResult[]>;

export function lookup(
    query: PSLookupQuery, 
    callback: (err: string, resultList: PSLookupResult[]) => void): void;

export function exists(
    query: PSLookupQuery
): Promise<boolean>;

export function kill(
    pid: number,
    signal: string | Signal,
): void;
