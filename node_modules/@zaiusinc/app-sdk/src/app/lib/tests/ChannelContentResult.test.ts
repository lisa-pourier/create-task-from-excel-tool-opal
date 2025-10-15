import 'jest';

import {ChannelContentResult} from '../ChannelContentResult';

describe('ChannelContentResult', () => {
  describe('addError', () => {
    it('adds errors for specific fields', () => {
      const result = new ChannelContentResult()
        .addError('settings', 'sender', 'name', 'Cannot be blank')
        .addError('template', 'message', 'title', 'Must be less than 50 characters')
        .addError('template', 'message', 'title', 'Cannot contain special characters');
      expect(result['errors']).toEqual({
        'settings.sender.name': ['Cannot be blank'],
        'template.message.title': ['Must be less than 50 characters', 'Cannot contain special characters']
      });
    });
  });

  describe('getResponse', () => {
    it('produces a response no errors or toasts', () => {
      expect(new ChannelContentResult().getResponse()).toEqual({
        errors: {},
        toasts: []
      });
    });

    it('includes errors and toasts in the response', () => {
      const result = new ChannelContentResult()
        .addError('template', 'message', 'title', 'Must be less than 50 characters')
        .addToast('danger', 'Publish failed');
      expect(result.getResponse()).toEqual({
        errors: {'template.message.title': ['Must be less than 50 characters']},
        toasts: [{intent: 'danger', message: 'Publish failed'}]
      });
    });
  });
});
