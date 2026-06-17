export interface PresetLink {
    label: string;
    url: string;
    type?: 'website' | 'discord' | 'signup' | 'voting' | 'bluesky';
}

export interface PresetCubeEntry {
    fetchedAt: string;
}

export interface PresetCollection {
    name: string;
    label: string;
    description?: string;
    icon?: string;
    links?: PresetLink[];
    cubes: Record<string, PresetCubeEntry>;
}
