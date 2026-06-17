export interface ManifestFetch {
    staleThreshold: string;
    shardCount: number;
    source?: string;
}

export interface Manifest {
    name: string;
    label: string;
    description?: string;
    icon?: string | null;
    links?: Array<{ label: string; url: string; type?: string }>;
    fetch: ManifestFetch | null;
    cubes: string[];
}
