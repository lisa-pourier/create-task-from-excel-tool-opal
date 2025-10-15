import 'jest';

import {FormResult} from '../FormResult';

class RealizedFormResult extends FormResult {}

describe('FormResult', () => {
  describe('addToast', () => {
    it('adds a toast with the specified intent', () => {
      const result = new RealizedFormResult().addToast('info', 'Here is some info');
      result.addToast('warning', 'This is a warning');
      expect(result['toasts']).toEqual([
        {
          intent: 'info',
          message: 'Here is some info'
        },
        {
          intent: 'warning',
          message: 'This is a warning'
        }
      ]);
    });
  });
});
