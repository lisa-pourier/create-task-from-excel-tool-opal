import 'jest';

import {ChannelTargetResult} from '../ChannelTargetResult';

describe('ChannelTargetResult', () => {
  describe('addError', () => {
    it('adds errors for specific fields', () => {
      const result = new ChannelTargetResult()
        .addError('sender', 'name', 'Cannot be blank')
        .addError('reply', 'name', 'Must be less than 50 characters')
        .addError('reply', 'name', 'Cannot contain special characters');
      expect(result['errors']).toEqual({
        'sender.name': ['Cannot be blank'],
        'reply.name': ['Must be less than 50 characters', 'Cannot contain special characters']
      });
    });
  });

  describe('getResponse', () => {
    it('produces a response with targeting requirements and no errors or toasts', () => {
      expect(new ChannelTargetResult([{identifier: 'foo_token'}, {identifier: 'bar_token'}]).getResponse()).toEqual({
        targeting: [{identifier: 'foo_token'}, {identifier: 'bar_token'}],
        errors: {},
        toasts: []
      });
    });

    it('produces a fallback toast when no information is provided', () => {
      expect(new ChannelTargetResult().getResponse()).toEqual({
        targeting: [],
        errors: {},
        toasts: [{intent: 'danger', message: 'Failed to determine targeting requirements'}]
      });
    });

    it('includes errors and toasts in the response', () => {
      const result = new ChannelTargetResult()
        .addError('sender', 'name', 'Cannot be blank')
        .addToast('danger', 'Something bad happened');
      expect(result.getResponse()).toEqual({
        targeting: [],
        errors: {'sender.name': ['Cannot be blank']},
        toasts: [{intent: 'danger', message: 'Something bad happened'}]
      });
    });
  });
});
