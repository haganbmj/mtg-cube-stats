# Notes for tomorrow

- History tab should list snapshots that are cached in indexedDB, but not currently loaded.
- When Comparing snapshots of the same cube, the "Only in" headers should show the Last Modified timestamp of the cube instead of the name.
- It might be better to decouple the Compare tab from LoadedCubes that are shown in the OverviewTab. It would be nice to be able to compare snapshots without having to fully add them to the OverviewTab?
- If the previous note is realized, then it may be better to have the History tab add a button for "Show/Hide in Overview" or something. Then it could simply reflect all snapshots from indexedDb by default, with the ability to compare, show/hide, and add additional.
- The dimming of the Cube in the Visual Grid is nice, but it would be good to also have a Time or Clock related icon overlaying the cube's thumbnail.

- The History tab of a snapshot should show the Live cube under loaded snapshots so that it can easily be compared. (EDIT: This looks to be possible, the UI is a little confusing though)
