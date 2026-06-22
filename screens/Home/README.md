# Home Screen

Main dashboard shown after login. Displays daily mission, streak, and ranking.

## Screen Layout

```
+-----------------------+
|  Purple Header        |
|  Good Morning  7Days  |
|  Kedus         [fire] |
|                       |
|  +- Todays Mission -+ |
|  | Lorem ipsum...?  | |
|  | [Start Mission]  | |
|  +------------------+ |
|                       |
|  +- Your Ranking ---+ |
|  | #22 in the state | |
|  | 50 pts           | |
|  | 15 pts to Amy    | |
|  | [============]   | |
|  +------------------+ |
|                       |
| [Home][?][Top][Me][Store] |
+-----------------------+
```

## Components

| Element | Description |
|---------|-------------|
| Header | Purple top bar with greeting |
| Greeting | "Good Morning [Name]" |
| Streak | Fire icon + "7 Days" streak count |
| Mission Widget | Today's challenge question preview |
| Start Mission button | Launches the challenge |
| Ranking Widget | Current rank, points, and progress bar |
| Tab Bar | Home, Challenge, Leaderboard, Profile, Store |

## Navigation

| Action | Goes to |
|--------|---------|
| Ranking Widget tap | Leaderboard screen |
| Start Mission button | Challenge screen |
| Tab Bar | Respective screens |
