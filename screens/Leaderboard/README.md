# Leaderboard Screen

Rankings screen showing top students by state, city, and school.

## Screen Layout

```
+-----------------------+
|  Leaderboard   [fire] |
|  [State][City][School]|
|                       |
|  1. Emma K.    480pts |
|     Aurora, IL        |
|  2. James T.   450pts |
|     Rockford, IL      |
|  3. Sophia R.  420pts |
|     Palatine, IL      |
|  ...                  |
|  #20 Amy D.    65pts  |
|  #21 Kedus M.  60pts  |  <- current user
|  #22 John P.   58pts  |
|                       |
|  Bonus x0.2  [===]    |
| [Home][?][Top][Me][Store] |
+-----------------------+
```

## Components

| Element | Description |
|---------|-------------|
| Header | "Leaderboard" title + streak count |
| Filter tabs | My State / My City / My School |
| Rankings list | Numbered list of top students with pts |
| Current user row | Highlighted own rank (#22 Kedus M.) |
| Nearby users | Ranks just above and below the user |
| Bonus indicator | Circular progress + score multiplier |
| Tab Bar | Bottom navigation |

## Navigation

| Action | Goes to |
|--------|---------|
| Tab Bar | Respective screens |
