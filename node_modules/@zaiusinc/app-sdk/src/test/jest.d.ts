declare namespace jest {
  interface Matchers<R> {
    jsonContaining: (expected: any) => R;
    jsonRepresenting: (expected: any) => R;
  }

  interface Expect {
    jsonContaining: (expected: any) => R;
    jsonRepresenting: (expected: any) => R;
  }
}
