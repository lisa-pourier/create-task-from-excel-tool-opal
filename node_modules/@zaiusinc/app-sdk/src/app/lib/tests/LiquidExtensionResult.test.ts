import 'jest';

import {LiquidExtensionResult} from '../LiquidExtensionResult';

describe('LiquidExtensionResult', () => {
  describe('getResponse', () => {
    it('produces success responses', () => {
      expect(LiquidExtensionResult.success('foo').getResponse()).toEqual({
        output: '"foo"'
      });
      expect(LiquidExtensionResult.success({foo: 'bar', buzz: 123}).getResponse()).toEqual({
        output: '{"foo":"bar","buzz":123}'
      });
      expect(LiquidExtensionResult.success(null).getResponse()).toEqual({
        output: 'null'
      });
      expect(LiquidExtensionResult.success(undefined).getResponse()).toEqual({
        output: 'null'
      });
    });

    it('produces error responses', () => {
      expect(LiquidExtensionResult.error('terrible input data').getResponse()).toEqual({
        error: 'terrible input data'
      });
      expect(LiquidExtensionResult.error('').getResponse()).toEqual({
        error: 'unknown'
      });
      expect(LiquidExtensionResult.error(null as any).getResponse()).toEqual({
        error: 'unknown'
      });
      expect(LiquidExtensionResult.error(undefined as any).getResponse()).toEqual({
        error: 'unknown'
      });
    });
  });
});
