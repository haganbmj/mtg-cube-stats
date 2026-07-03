import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'capitol-cube-champs-2026',
    label: 'Capitol Cube Champs 2026',
    description: 'Washington, D.C. - Sept. 19, 2026',
    icon: 'https://capitolcube.org/capital_city_cube.png',
    links: [
        { label: 'Event Website', url: 'https://capitolcube.org', type: 'website' },
        { label: 'Discord', url: 'https://discord.gg/fT2vUxeXzH', type: 'discord' },
        { label: 'Bluesky', url: 'https://bsky.app/profile/capitolcube.org', type: 'bluesky' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 3 },
    cubes: [
        'd2d2865f-0649-44f8-acd8-965f5829ca1a', // DANGER ZONE
        '5f9c551d9b11040fd152282b', // Fast and Friendly Cube
        'e7f9707d-3c85-4741-9825-63e43a9e41e3', // Limited Masters: Tournament Edition
        '7cefb710-c68f-4d01-b77f-dc1e6d03c70e', // Oops, All Foils
        'f9c3592d-f225-452e-a8ce-d3015f01bc78', // The Bacon (Vintage) Cube
        '5f089f4fda10250fbdd5c160', // The Blink Cube
        '955dfa62-31bd-4c03-9a4c-03b9048ee82b', // The Conversion Cube
        'a9fe75b7-d00b-4342-899b-9d2bd25f8a66', // The Desert Bird
        '0718b9a8-7580-47da-bd5e-3b3a1701fb3a', // The Kuleshov Cube
        'd5c56175-4e10-4e41-9e4e-08fc01439c4b', // The Legacy of Bloodwake Atoll
        '216fe320-4d78-4d1f-aae4-b36231f59a9e', // The Library of Babel
        'f907f0a5-8e95-474a-a879-6cced27aaeb3', // The Middle School
        '636e940b282cc10f6a181e75', // The Penrose Cube
        'b9a0475c-2c66-43d6-b9d9-2ade2b493fd0', // The Premodern Unchained Cube
        'ae9f493b-b6c8-4a73-9c09-35d9010e2a42', // The Trinket Cube
        // Plus an Undisclosed One.
    ],
};

export default manifest;
