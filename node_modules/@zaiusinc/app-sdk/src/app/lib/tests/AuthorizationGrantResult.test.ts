import 'jest';

import {AuthorizationGrantResult} from '../AuthorizationGrantResult';

describe('AuthorizationGrantResult', () => {
  describe('addError', () => {
    it('adds errors for specific fields', () => {
      const result = new AuthorizationGrantResult('oauth').addError('username', 'Cannot be blank');
      result.addError('password', 'Cannot be one of the three most commonly used passwords');
      result.addError('password', 'Must be exactly 27 characters');
      expect(result['errors']).toEqual({
        'oauth.username': ['Cannot be blank'],
        'oauth.password': ['Cannot be one of the three most commonly used passwords', 'Must be exactly 27 characters']
      });
    });
  });

  describe('getResponse', () => {
    it('produces a response without any errors/etc', () => {
      expect(new AuthorizationGrantResult('oauth').getResponse()).toEqual({
        redirect: 'oauth',
        redirectMode: 'settings',
        errors: {},
        toasts: []
      });
    });

    it('includes errors and toasts in the response', () => {
      const result = new AuthorizationGrantResult('foo')
        .addError('password', 'Cannot be one of the three most commonly used passwords')
        .addToast('danger', 'Authorization failed');
      expect(result.getResponse()).toEqual({
        redirect: 'foo',
        redirectMode: 'settings',
        errors: {'foo.password': ['Cannot be one of the three most commonly used passwords']},
        toasts: [{intent: 'danger', message: 'Authorization failed'}]
      });
    });
  });
});
