// @expo/vector-icons loads its icon font asynchronously and setState()s when
// done, which fires "not wrapped in act(...)" errors in tests. Report the font
// as already loaded so Icon renders synchronously.
jest.mock("expo-font", () => {
  const actual = jest.requireActual("expo-font");
  return {
    ...actual,
    isLoaded: () => true,
    loadAsync: () => Promise.resolve(),
    useFonts: () => [true, null],
  };
});
