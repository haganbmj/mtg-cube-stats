import type { Manifest } from './types';

const manifest: Manifest = {
    name: 'cubecon2026',
    label: 'CubeCon 2026',
    description: 'Madison, WI - August 26-30, 2026',
    icon: 'https://haganbmj-misc-cube.s3.us-east-2.amazonaws.com/FfWtopWXkAAQ5cS.png',
    links: [
        { label: 'Event Website', url: 'https://cubecon.org', type: 'website' },
        { label: 'Signup', url: 'https://cubecon.org/CubeCon2026/attend', type: 'signup' },
        { label: 'Discord', url: 'https://discord.gg/gMuVpU6q4Q', type: 'discord' },
        { label: 'Bluesky', url: 'https://bsky.app/profile/cubecon.org', type: 'bluesky' },
    ],
    fetch: { staleThreshold: '1d', shardCount: 4 },
    cubes: [
        'a45a04cd-9b52-42b9-a602-b7f857c1aa36', // A Brooding Saga: Cubecon 2026
        '43684f97-93c5-4ef3-95e8-8a8095859232', // The Absolute Junk Cube (Abzan)
        'b6ce3845-d40c-4b34-9352-d003dde0e670', // Alpha Reimagined
        '1efd75a8-91de-498c-b3ee-24df7bde3a38', // Alternate History Powered Cube
        '5fc9e578bada5f7f15feb582', // aquaone Powered Cube
        '015d501b-a03f-4767-9c7e-5ba667433644', // The Bearclaw Changeling Cube
        'dd8976ec-160b-4bfe-af4f-24e71976967a', // Breaking the Oath Cube
        '6400c8c11b98ce50ca72c39f', // The Chicago Cube
        'a053a34d-2aca-41bf-902b-63f57872c20b', // The Circle of Life
        'c70058e4-01f4-42b1-aba1-24cb653ab9ee', // The CORESIR Cube
        '6413e9038d5d8938753c40ac', // Echoes of Creation
        '17fa4f29-ad19-4eb4-94cf-525d2697f082', // Enchanted Evening
        '37475a24-8f7d-448e-b562-1404e42f390d', // THE FLOOR IS LAVA
        '68c09094-c473-47cd-893b-e9d8a3d66fbe', // I Loot The Body
        '5a1d3ff2-3eec-40c0-849c-e19de60305ae', // Innistrad to Eldritch Moon 2011-2016 Golden Age Standard Cube
        'aefb5841-8654-48fc-9b02-ba5062a651cd', // The Mardube
        '6122a60ae66c4a105041808a', // Old Border Foil Cube
        '2f166be5-e08e-4223-8883-4782471f58b4', // Omnipresent Impostors
        '302c8800-db4d-473f-b6ed-2dd3467ffa8e', // Options Cube
        '6003518eeaf0061046b4c9ae', // The Peasant+ Cube
        '620aae27d364780ff32bb6ae', // The Pioneer Showcase
        '5d3ed83247586d63776acbf6', // Sammich's Peasant Cube
        'e47b3c84-4bdd-464c-8bfd-203643389b0f', // The Six Drop Cube
        '63322a647545331a605f8df1', // Spicy Ramen Cube
        '5d8171de91139f32f85d1200', // Unplayables Cube
        '077a945b-f5b0-403c-8900-27bfda429257', // The Vintage Cube Retirement Home
        'f78dab79-4c6d-4da7-9834-85c7eed380a8', // Vistas Unventured
        'bd9bfd7d-12a1-4442-9b20-5ffee6e8d7ce', // World Championship Museum (96-04)
        'd167470c-b7ba-4fac-b9a1-2ed599357d54', // Prismatic Wilds
        'b2c27903-e5ca-45a7-b264-2239c18217cb', // Esper Cube
        '6c078fb9-5559-4296-a57b-5d86ed19ae90', // HeatherCube
        'd5c56175-4e10-4e41-9e4e-08fc01439c4b', // The Legacy of Bloodwake Atoll
        '9b10cb19-6018-4f14-8682-1a4e38d9d526', // The Pit
        '0fb014f6-3fe1-486c-9cfb-81a78053208d', // How Bazaar, How Bazaar
        'ce678ae4-ed17-41fc-88c8-b6c66e305c0b', // The Exile Files
        'e4f78fea-edfe-4134-af6c-30878142e035', // Death By Ten Cuts
        'a88a0418-0a55-457a-92f9-cdf44d362750', // Bridges Over Troubled Water
        '1732d8d0-6803-4d60-8680-3a8e0f05a664', // GUT
        '81a7639f-fe0f-4ad2-9bbd-2f3dc35cf484', // 1UP Cube
        '630291c300eb860734853b05', // Clean Evergreen
        '5fca9a5abada5f7f150c8c2e', // Hackett Cube
        '5d893e44e9d4421b2dd8ff45', // The Endless Cycle
        'bdd22c80-e14b-48aa-b7aa-3122d0dd1ebd', // Cube Save America: The Obama Years and Frame Realignment
        '71a6c512-0d90-4801-a0fc-5864f5d468fb', // Tiny Axe
        'e353934d-cfe8-4eb2-90f5-6e6688b86ebb', // The Trading Post Cube
        '7ee389d9-61c7-45ab-9078-97ebfe2e9d9a', // Good Clean Magic
        '3b63f9b4-99b1-41f0-ab05-b3dc7850c9c1', // Like Tears in Rain
        '5ee84f3e7c9901100bc212d1', // Fifteen Card Highlander
        '0e2e86be-6674-4e69-be38-6a3ba63c0a93', // Stadium Stampede
        '3b5e5b8b-4aee-456f-b0a4-fd1994c31565', // Jank Assembly
        '6291a0072d25a32206e9e19a', // Good Old Days: The Classic Frame Experience
        '54cbb003-f636-4eed-bfeb-a5dd76516dd9', // The Fish Tank
        'a374e4bb-ad6e-4bf6-b9a7-5eadfce5c13b', // What if K'rrik were real?
        '8f2e2e54-88b0-42f7-af64-943760d9d0e7', // Mazes in the Desert
        '62e12d83-0030-4fef-b661-a277135bfe02', // Spy Games
        'e7e1e793-f89b-4db8-bc2f-9a35db34d76c', // Jank Diver Peasant Cube (Cubecon)
        '2dcf6fff-76c0-48bf-bc40-bd7ccb87b15d', // The Graveyard Shift
    ],
};

export default manifest;
