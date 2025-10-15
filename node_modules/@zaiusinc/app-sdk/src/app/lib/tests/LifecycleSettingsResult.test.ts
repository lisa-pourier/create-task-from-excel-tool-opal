import 'jest';

import {LifecycleSettingsResult} from '../LifecycleSettingsResult';

describe('LifecycleSettingsResult', () => {
  describe('addError', () => {
    it('adds errors for specific fields', () => {
      const result = new LifecycleSettingsResult().addError('username', 'Cannot be blank');
      result.addError('password', 'Cannot be one of the three most commonly used passwords');
      result.addError('password', 'Must be exactly 27 characters');
      expect(result['errors']).toEqual({
        username: ['Cannot be blank'],
        password: ['Cannot be one of the three most commonly used passwords', 'Must be exactly 27 characters']
      });
    });
  });

  describe('redirect', () => {
    it('configures a url-mode redirect', () => {
      const result = new LifecycleSettingsResult().redirect('https://zaius.com');
      expect(result['redirectValue']).toEqual('https://zaius.com');
      expect(result['redirectMode']).toEqual('url');
    });
  });

  describe('redirectToSettings', () => {
    it('configures a settings-mode redirect', () => {
      const result = new LifecycleSettingsResult().redirectToSettings('foo');
      expect(result['redirectValue']).toEqual('foo');
      expect(result['redirectMode']).toEqual('settings');
    });
  });

  describe('getResponse', () => {
    it('produces a response without any errors/etc', () => {
      expect(new LifecycleSettingsResult().getResponse('foo')).toEqual({
        redirect: undefined,
        redirectMode: undefined,
        errors: {},
        toasts: []
      });
    });

    it('produces a response with a redirect', () => {
      expect(new LifecycleSettingsResult().redirect('https://zaius.com').getResponse('foo')).toEqual({
        redirect: 'https://zaius.com',
        redirectMode: 'url',
        errors: {},
        toasts: []
      });
    });

    it('includes errors prefixed with the section and toasts in the response', () => {
      const result = new LifecycleSettingsResult()
        .addError('password', 'Cannot be one of the three most commonly used passwords')
        .addToast('danger', 'Authorization failed');
      expect(result.getResponse('foo')).toEqual({
        redirect: undefined,
        redirectMode: undefined,
        errors: {'foo.password': ['Cannot be one of the three most commonly used passwords']},
        toasts: [{intent: 'danger', message: 'Authorization failed'}]
      });
    });
  });
});
